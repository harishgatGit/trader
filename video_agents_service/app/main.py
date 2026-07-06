import os
import json
import uuid
import queue
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import FastAPI, Header, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, HTMLResponse
from urllib.parse import urlencode
import httpx
from pydantic import BaseModel

from app.config import PORT, VIDEO_SERVICE_API_KEY, REMOTION_PROJECT_PATH, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, BACKEND_URL, CURRENT_APP_CALLBACK_API_KEY, ALLOWED_ORIGINS
from app.models.report_input import VideoJobRequest
from app.models.video_job import VideoJob, JobStatus, VideoJobArtifacts
from app.models.validation import VideoValidationResult

from app.agents.youtube_metadata_agent import YouTubeMetadataAgent
from app.agents.youtube_uploader_agent import YouTubeUploaderAgent

# Import Services and Agents
from app.services.storage_service import StorageService
from app.services.tts_service import TTSService
from app.services.ffmpeg_service import FFmpegService
from app.services.remotion_renderer import RemotionRenderer
from app.services.callback_service import CallbackService

from app.agents.report_narrative_extractor import ReportNarrativeExtractor
from app.agents.video_story_agent import VideoStoryAgent
from app.agents.storyboard_agent import StoryboardAgent
from app.agents.voiceover_agent import VoiceoverAgent
from app.agents.animation_render_agent import AnimationRenderAgent
from app.agents.video_validation_agent import VideoValidationAgent
from app.agents.market_recap_narrative_extractor import MarketRecapNarrativeExtractor
from app.agents.market_recap_story_agent import MarketRecapStoryAgent
from app.agents.market_recap_storyboard_agent import MarketRecapStoryboardAgent

# DB and Eligibility
from app import db as job_db
from app.eligibility import check_eligibility

app = FastAPI(title="InvestingAtti Stock Video Agents Service")

# CORS setup — restrict to backend origin only (this is an internal service)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "x-api-key"],
)

# Initialize Services and Agents
storage_service = StorageService()
tts_service = TTSService()
ffmpeg_service = FFmpegService()
remotion_renderer = RemotionRenderer()
callback_service = CallbackService()

extractor_agent = ReportNarrativeExtractor()
story_agent = VideoStoryAgent()
storyboard_agent = StoryboardAgent()
voiceover_agent = VoiceoverAgent(tts_service, ffmpeg_service)
render_agent = AnimationRenderAgent(remotion_renderer)
validation_agent = VideoValidationAgent(ffmpeg_service)

# Market Recap agents (used for MARKET_RECAP video format)
market_recap_extractor = MarketRecapNarrativeExtractor()
market_recap_story_agent = MarketRecapStoryAgent()
market_recap_storyboard_agent = MarketRecapStoryboardAgent()

# YouTube Agents
youtube_metadata_agent = YouTubeMetadataAgent()
youtube_uploader_agent = YouTubeUploaderAgent()

# In-memory active jobs map (jobId -> VideoJob)
active_jobs: Dict[str, VideoJob] = {}


@app.on_event("startup")
def on_startup():
    """Initialize the SQLite job tracking database on service start."""
    job_db.init_db()
    print("[Startup] Video job tracking DB initialized.")

    # Warn loudly if default placeholder keys are still in use
    _INSECURE_DEFAULTS = {"your-key", "your-key-here", ""}
    if (VIDEO_SERVICE_API_KEY or "").strip() in _INSECURE_DEFAULTS:
        print("[Startup] WARNING: VIDEO_SERVICE_API_KEY is using an insecure default. Set a strong key in .env.")
    if (CURRENT_APP_CALLBACK_API_KEY or "").strip() in _INSECURE_DEFAULTS:
        print("[Startup] WARNING: CURRENT_APP_CALLBACK_API_KEY is using an insecure default. Set a strong key in .env.")


@app.get("/health")
def health_check():
    """Health check endpoint for Docker and load balancer probes."""
    return {"status": "ok", "service": "InvestingAtti Video Agents Service"}


def get_api_key(x_api_key: Optional[str] = Header(None)) -> str:
    """Verifies incoming API key header if configured"""
    if VIDEO_SERVICE_API_KEY and x_api_key != VIDEO_SERVICE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key header (x-api-key)"
        )
    return x_api_key or ""


def get_job_state_file(ticker: str, date_str: str) -> Path:
    job_dir = storage_service.get_job_dir(ticker, date_str)
    return job_dir / "job-state.json"


def persist_job(job: VideoJob):
    """Saves the job state to disk in its respective outputs directory"""
    state_file = get_job_state_file(job.ticker, job.reportDate)
    state_file.parent.mkdir(parents=True, exist_ok=True)
    with open(state_file, 'w', encoding='utf-8') as f:
        f.write(job.model_dump_json(indent=2))
    # Update active jobs map
    active_jobs[job.jobId] = job


def load_job_from_disk(ticker: str, date_str: str) -> Optional[VideoJob]:
    """Loads a job state from disk if it exists"""
    state_file = get_job_state_file(ticker, date_str)
    if state_file.exists():
        try:
            with open(state_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                job = VideoJob(**data)
                active_jobs[job.jobId] = job
                return job
        except Exception as e:
            print(f"Failed to load job state for {ticker}/{date_str}: {e}")
    return None


def find_job_by_id(job_id: str) -> Optional[VideoJob]:
    """Finds a job in memory, or searches disk if not found"""
    if job_id in active_jobs:
        return active_jobs[job_id]

    # Scan output directory files to find the state file matching this jobId
    base_dir = storage_service.base_dir
    if base_dir.exists():
        for path in base_dir.glob("**/job-state.json"):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if data.get("jobId") == job_id:
                        job = VideoJob(**data)
                        active_jobs[job_id] = job
                        return job
            except:
                pass
    return None


def trigger_callback(job: VideoJob):
    """Triggers callback notification back to NestJS to update the backend DB mirror."""
    payload = {
        "jobId": job.jobId,
        "reportId": job.reportId,
        "ticker": job.ticker,
        "reportDate": job.reportDate,
        "status": job.status,
        "videoUrl": job.videoUrl,
        "eligibilityNote": job.eligibilityNote,
        "artifacts": {
            "sourceReport": job.artifacts.sourceReport,
            "normalizedInput": job.artifacts.normalizedInput,
            "script": job.artifacts.script,
            "storyboard": job.artifacts.storyboard,
            "audio": job.artifacts.audio,
            "ffprobe": job.artifacts.ffprobe,
            "validation": job.artifacts.validation,
            "finalVideo": job.artifacts.finalVideo
        },
        "errorMessage": job.errorMessage,
        "videoFormat": job.videoFormat
    }
    callback_service.send_callback(payload)


def run_video_generation_workflow(job_id: str):
    """
    Core multi-agent video generation pipeline.
    
    Input is the pre-scraped and pre-analyzed data from the NestJS backend.
    The video agent service does NOT re-analyze the stock — it uses what was
    provided. Agents focus on script writing, storyboard creation, and rendering.
    
    Executes in the background (queue worker thread).
    Status progression: QUEUED → REPORT_RECEIVED → SCRIPT_GENERATED →
      STORYBOARD_GENERATED → VOICEOVER_GENERATED → ANIMATION_RENDERED → GENERATED
    """
    job = find_job_by_id(job_id)
    if not job:
        print(f"Background task failed: Job {job_id} not found.")
        return

    job.status = JobStatus.REPORT_RECEIVED
    persist_job(job)
    job_db.update_status(job_id, "REPORT_RECEIVED")
    trigger_callback(job)

    job_dir = storage_service.get_job_dir(job.ticker, job.reportDate)

    try:
        # Load source report JSON (written during POST /video-jobs)
        source_report_path = job_dir / "source-report.json"
        if not source_report_path.exists():
            raise Exception("Source report file missing.")

        with open(source_report_path, 'r', encoding='utf-8') as f:
            report_json = json.load(f)

        is_market_recap = job.videoFormat == "MARKET_RECAP"

        # ----------------------------------------------------
        # Agent 1: Normalize Report
        # For MARKET_RECAP: use MarketRecapNarrativeExtractor
        # For stock formats: use ReportNarrativeExtractor (no re-analysis)
        # ----------------------------------------------------
        print(f"[{job.ticker}] Normalizing report narrative (format={job.videoFormat})...")
        norm_input_path = job_dir / "normalized-video-input.json"
        if is_market_recap:
            normalized_data = market_recap_extractor.extract(report_json, norm_input_path)
        else:
            normalized_data = extractor_agent.extract(report_json, norm_input_path)
        job.artifacts.normalizedInput = str(norm_input_path.resolve())
        persist_job(job)

        # ----------------------------------------------------
        # Agent 2: Generate Narration Script
        # ----------------------------------------------------
        print(f"[{job.ticker}] Generating script (format={job.videoFormat})...")
        script_path = job_dir / "narration-script.txt"
        if is_market_recap:
            script_text = market_recap_story_agent.generate(normalized_data, script_path)
        else:
            script_text = story_agent.generate(normalized_data, script_path, video_format=job.videoFormat)
        job.artifacts.script = str(script_path.resolve())
        job.status = JobStatus.SCRIPT_GENERATED
        persist_job(job)
        job_db.update_status(job_id, "SCRIPT_GENERATED")
        trigger_callback(job)

        # ----------------------------------------------------
        # Agent 3: Generate Storyboard JSON
        # ----------------------------------------------------
        print(f"[{job.ticker}] Creating storyboard (format={job.videoFormat})...")
        storyboard_path = job_dir / "storyboard.json"
        if is_market_recap:
            storyboard = market_recap_storyboard_agent.generate(normalized_data, script_text, storyboard_path)
        else:
            storyboard = storyboard_agent.generate(normalized_data, script_text, storyboard_path, video_format=job.videoFormat)
        job.artifacts.storyboard = str(storyboard_path.resolve())
        job.status = JobStatus.STORYBOARD_GENERATED
        persist_job(job)
        job_db.update_status(job_id, "STORYBOARD_GENERATED")
        trigger_callback(job)

        # ----------------------------------------------------
        # Agent 4: Generate Voiceover TTS & Normalize
        # ----------------------------------------------------
        print(f"[{job.ticker}] Generating voiceover audio (format={job.videoFormat})...")
        audio_path = voiceover_agent.generate(script_text, job_dir, video_format=job.videoFormat)
        job.artifacts.audio = str(audio_path.resolve())
        job.status = JobStatus.VOICEOVER_GENERATED
        persist_job(job)
        job_db.update_status(job_id, "VOICEOVER_GENERATED")
        trigger_callback(job)

        # Align storyboard scene durations with actual generated audio duration
        try:
            probe = ffmpeg_service.probe_media(audio_path)
            audio_duration = float(probe.get("format", {}).get("duration", 0))
            print(f"[{job.ticker}] Aligned audio duration: {audio_duration:.2f}s. Adjusting storyboard scene durations...")

            scenes_list = storyboard.get("storyboard") or storyboard.get("scenes") or []
            if scenes_list:
                char_counts = [len((s.get("narration") or s.get("voiceover") or "").strip()) for s in scenes_list]
                total_chars = sum(char_counts)

                if total_chars > 0:
                    for i, scene in enumerate(scenes_list):
                        prop = char_counts[i] / total_chars
                        scene_dur = max(5.0, prop * audio_duration)
                        scene["durationSeconds"] = round(scene_dur, 2)

                    actual_sum = sum(s["durationSeconds"] for s in scenes_list)
                    diff = (audio_duration + 1.5) - actual_sum
                    scenes_list[-1]["durationSeconds"] = round(max(5.0, scenes_list[-1]["durationSeconds"] + diff), 2)
                    storyboard["durationSeconds"] = sum(float(s.get("durationSeconds", 6)) for s in scenes_list)

                    storyboard_path = job_dir / "storyboard.json"
                    with open(storyboard_path, 'w', encoding='utf-8') as f:
                        json.dump(storyboard, f, indent=2)
                    print(f"[{job.ticker}] Aligned storyboard.json scene durations (total: {storyboard['durationSeconds']:.2f}s)")
        except Exception as align_err:
            print(f"[{job.ticker}] Warning: Failed to align scene durations: {align_err}")

        # ----------------------------------------------------
        # Agent 5: Render Slide Animations (Remotion)
        # ----------------------------------------------------
        print(f"[{job.ticker}] Rendering animations with Remotion (format={job.videoFormat})...")
        video_path = render_agent.render(normalized_data, storyboard, audio_path, job_dir, video_format=job.videoFormat)

        job.videoUrl = f"/api/video-jobs/{job.jobId}/video"
        job.artifacts.finalVideo = str(video_path.resolve())

        ffprobe_path = job_dir / "ffprobe.json"
        try:
            probe_data = ffmpeg_service.probe_media(video_path)
            with open(ffprobe_path, 'w', encoding='utf-8') as f:
                json.dump(probe_data, f, indent=2)
            job.artifacts.ffprobe = str(ffprobe_path.resolve())
        except:
            pass

        job.status = JobStatus.ANIMATION_RENDERED
        persist_job(job)

        # ----------------------------------------------------
        # Agent 6: Video Validation
        # ----------------------------------------------------
        print(f"[{job.ticker}] Validating final video stream and frame differences...")
        validation_path = job_dir / "validation-result.json"
        val_result = validation_agent.validate(video_path, validation_path)
        job.artifacts.validation = str(validation_path.resolve())

        if not val_result.passed:
            err_msg = "; ".join(val_result.errors)
            raise Exception(f"Video validation failed: {err_msg}")

        # ── SUCCESS ──────────────────────────────────────────────────────────
        job.status = JobStatus.GENERATED
        job.completedAt = datetime.utcnow()
        persist_job(job)
        job_db.update_status(job_id, "GENERATED")
        trigger_callback(job)
        print(f"[{job.ticker}] Video generation completed successfully!")

    except Exception as e:
        error_msg = str(e)
        print(f"[{job.ticker}] Generation failed: {error_msg}")
        job.status = JobStatus.ERROR
        job.errorMessage = error_msg
        job.completedAt = datetime.utcnow()
        persist_job(job)
        job_db.update_status(job_id, "ERROR", error_message=error_msg)
        trigger_callback(job)


# ── Thread-safe queue and background worker ──────────────────────────────────

video_job_queue = queue.Queue()


def queue_worker_loop():
    print("Starting background video generation queue worker thread...")
    while True:
        try:
            job_id = video_job_queue.get()
            print(f"Background worker picked up job: {job_id}")
            run_video_generation_workflow(job_id)
        except Exception as e:
            print(f"Error in background queue worker thread: {e}")
        finally:
            video_job_queue.task_done()


worker_thread = threading.Thread(target=queue_worker_loop, daemon=True)
worker_thread.start()


# ── API Endpoints ────────────────────────────────────────────────────────────

@app.post("/video-jobs", response_model=VideoJob)
def create_video_job(request: VideoJobRequest, api_key: str = Depends(get_api_key)):
    """
    Entry point for backend fire-and-forget video requests.

    Flow:
      1. Log request in DB with status = RECEIVED
      2. Run eligibility check
      3a. Not eligible → update DB to NOT_ELIGIBLE, log reason, return 200
      3b. Eligible → update DB to QUEUED, push to internal thread queue, return 200

    The backend NestJS service is called back with status updates as the
    pipeline progresses. This endpoint always returns immediately.
    """
    ticker = request.ticker.upper()
    date_str = request.reportDate
    job_id = str(uuid.uuid4())

    # ── Step 1: Log as RECEIVED ──────────────────────────────────────────────
    print(f"[{ticker}] Video request received (job_id={job_id})")
    job_db.upsert_received(job_id, ticker, date_str, request.reportId, request.forceRegenerate)

    # ── Step 2: Eligibility check ────────────────────────────────────────────
    eligible, reason = check_eligibility(ticker, date_str, request.reportJson, request.forceRegenerate, request.videoFormat)

    if not eligible:
        # ── Step 3a: Not eligible ────────────────────────────────────────────
        print(f"[{ticker}] Not eligible: {reason}")
        job_db.update_status(job_id, "NOT_ELIGIBLE", eligibility_note=reason)

        not_eligible_job = VideoJob(
            jobId=job_id,
            reportId=request.reportId,
            ticker=ticker,
            reportDate=date_str,
            status=JobStatus.NOT_ELIGIBLE,
            eligibilityNote=reason,
            forceRegenerate=request.forceRegenerate,
            videoFormat=request.videoFormat,
        )
        # Callback NestJS to update backend DB mirror
        try:
            trigger_callback(not_eligible_job)
        except Exception as cb_err:
            print(f"[{ticker}] Callback failed (non-fatal): {cb_err}")

        return not_eligible_job

    # ── Step 3b: Eligible — initialize job, save source report, queue ────────
    job = VideoJob(
        jobId=job_id,
        reportId=request.reportId,
        ticker=ticker,
        reportDate=date_str,
        status=JobStatus.QUEUED,
        forceRegenerate=request.forceRegenerate,
        videoFormat=request.videoFormat,
    )

    # Save source report to disk (pipeline agents will read it)
    job_dir = storage_service.get_job_dir(ticker, date_str)
    source_report_path = job_dir / "source-report.json"
    source_report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(source_report_path, 'w', encoding='utf-8') as f:
        json.dump(request.reportJson, f, indent=2)

    job.artifacts.sourceReport = str(source_report_path.resolve())
    persist_job(job)

    # Update DB to QUEUED and push to worker queue
    job_db.update_status(job_id, "QUEUED")
    video_job_queue.put(job_id)

    print(f"[{ticker}] Job {job_id} queued for video generation.")

    # Callback NestJS with QUEUED status
    try:
        trigger_callback(job)
    except Exception as cb_err:
        print(f"[{ticker}] Initial callback failed (non-fatal): {cb_err}")

    return job


@app.get("/video-jobs/{jobId}", response_model=VideoJob)
def get_video_job(jobId: str, api_key: str = Depends(get_api_key)):
    """Returns the job status details"""
    job = find_job_by_id(jobId)
    if not job:
        raise HTTPException(status_code=404, detail=f"Video job {jobId} not found")
    return job


@app.get("/video-jobs/ticker/{ticker}/{date}", response_model=VideoJob)
def get_video_job_by_ticker(ticker: str, date: str, api_key: str = Depends(get_api_key)):
    """Returns the latest video job for the symbol/date"""
    job = load_job_from_disk(ticker, date)
    if not job:
        raise HTTPException(status_code=404, detail=f"No video job found for {ticker} on {date}")
    return job


@app.post("/video-jobs/{jobId}/retry", response_model=VideoJob)
def retry_video_job(jobId: str, api_key: str = Depends(get_api_key)):
    """Retries a failed/errored video job"""
    job = find_job_by_id(jobId)
    if not job:
        raise HTTPException(status_code=404, detail=f"Video job {jobId} not found")

    if job.status == JobStatus.GENERATED or job.status == JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Cannot retry a successfully completed video job")

    # Reset job for retry
    job.status = JobStatus.QUEUED
    job.errorMessage = None
    job.completedAt = None
    job.startedAt = datetime.utcnow()
    persist_job(job)

    job_db.update_status(jobId, "QUEUED")
    video_job_queue.put(jobId)

    print(f"[{job.ticker}] Job {jobId} requeued for retry.")
    return job


# ── YouTube Upload endpoints ───────────────────────────────────

class YouTubeUploadRequest(BaseModel):
    jobId: str
    ticker: str
    reportDate: str
    videoPath: str
    reportData: Dict[str, Any]
    refreshToken: Optional[str] = None
    visibility: Optional[str] = "private"

def process_youtube_upload_task(req: YouTubeUploadRequest):
    """
    Background worker:
    1. Craft metadata using the metadata agent.
    2. Upload file content to YouTube using chunked resumable upload.
    3. Call the NestJS backend's callback endpoint with results.
    """
    job_id = req.jobId
    ticker = req.ticker
    report_date = req.reportDate
    video_path = req.videoPath
    report_data = req.reportData
    visibility = req.visibility
    refresh_token = req.refreshToken

    # Initialize callback status
    payload = {
        "jobId": job_id,
        "youtubeUploadStatus": "UPLOADING"
    }
    send_youtube_callback(payload)

    try:
        # Extract metadata helpers
        rating = report_data.get("finalRating", "ANALYZED")
        summary = report_data.get("executiveSummary", "AI stock analysis report")
        report_json = report_data.get("reportJson", {})
        bias = report_json.get("technicals", {}).get("primary", {}).get("overallBias", "") if isinstance(report_json, dict) else ""
        rsi = str(report_json.get("technicals", {}).get("primary", {}).get("rsi14", "")) if isinstance(report_json, dict) else ""
        sector = report_json.get("fundamentals", {}).get("sector", "") if isinstance(report_json, dict) else ""

        # 1. Generate Metadata
        print(f"[YouTube Job] Generating metadata for {ticker}...")
        meta = youtube_metadata_agent.generate(ticker, report_date, rating, summary, bias, rsi, sector)
        title = meta.get("title", f"${ticker} Stock Analysis - {report_date}")
        description = meta.get("description", summary)
        tags = meta.get("tags", [ticker, "stocks"])

        # 2. Upload Video
        print(f"[YouTube Job] Uploading video for {ticker} from {video_path}...")
        video_id = youtube_uploader_agent.upload(
            file_path=video_path,
            title=title,
            description=description,
            tags=tags,
            refresh_token=refresh_token,
            visibility=visibility
        )

        # 3. Successful Upload Payload
        payload = {
            "jobId": job_id,
            "youtubeVideoId": video_id,
            "youtubeUrl": f"https://www.youtube.com/watch?v={video_id}",
            "youtubeTitle": title,
            "youtubeDescription": description,
            "youtubeUploadStatus": "UPLOADED",
            "youtubeUploadError": None
        }
    except Exception as e:
        print(f"[YouTube Job] ❌ Upload task failed for {ticker}: {e}")
        payload = {
            "jobId": job_id,
            "youtubeUploadStatus": "FAILED",
            "youtubeUploadError": str(e)
        }

    # Send final callback
    send_youtube_callback(payload)

def send_youtube_callback(payload: dict):
    callback_url = f"{BACKEND_URL}/api/youtube-callback"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": CURRENT_APP_CALLBACK_API_KEY or ""
    }
    try:
        print(f"[YouTube Job] Sending callback to NestJS: {callback_url}")
        res = httpx.post(callback_url, json=payload, headers=headers, timeout=10.0)
        if res.status_code in (200, 201):
            print("[YouTube Job] Callback sent successfully.")
        else:
            print(f"[YouTube Job] Callback error status {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[YouTube Job] Failed to send callback to NestJS: {e}")

@app.post("/youtube/upload", status_code=status.HTTP_202_ACCEPTED)
def upload_youtube_video(
    req: YouTubeUploadRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(get_api_key)
):
    """
    Enqueues the YouTube upload task in the background and returns accepted.
    """
    background_tasks.add_task(process_youtube_upload_task, req)
    return {"status": "queued", "jobId": req.jobId}

@app.get("/youtube/login")
def youtube_login():
    """
    Redirects the user to the Google OAuth consent screen.
    """
    if not YOUTUBE_CLIENT_ID or not YOUTUBE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="YouTube Client ID or Client Secret not configured in .env."
        )

    params = {
        "client_id": YOUTUBE_CLIENT_ID,
        "redirect_uri": "http://localhost:8090/youtube/oauth2callback",
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload",
        "access_type": "offline",
        "prompt": "consent"
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(auth_url)

@app.get("/youtube/oauth2callback", response_class=HTMLResponse)
def youtube_oauth2callback(code: Optional[str] = None, error: Optional[str] = None):
    """
    Receives authorization code from Google OAuth, exchanges it, and saves it to tokens.json.
    """
    if error:
        return f"""
        <html>
            <head>
                <title>Authorization Failed</title>
                <style>
                    body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; margin-top: 100px; background-color: #1e1e2e; color: #f38ba8; }}
                    .card {{ background-color: #313244; padding: 40px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }}
                    a {{ display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #89b4fa; color: #11111b; text-decoration: none; border-radius: 6px; font-weight: bold; }}
                    a:hover {{ background-color: #b4befe; }}
                </style>
            </head>
            <body>
                <div class="card">
                    <h1 style="font-size: 2.5em; margin: 0 0 10px 0;">❌ OAuth Error</h1>
                    <p style="font-size: 1.2em; color: #cdd6f4;">{error}</p>
                    <a href="/youtube/login">Try Login Again</a>
                </div>
            </body>
        </html>
        """

    if not code:
        raise HTTPException(status_code=400, detail="Authorization code is missing.")

    try:
        # Exhange the code and persist to tokens.json
        youtube_uploader_agent.get_credentials(auth_code=code)
        return """
        <html>
            <head>
                <title>Authorization Successful</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; margin-top: 100px; background-color: #1e1e2e; color: #a6e3a1; }
                    .card { background-color: #313244; padding: 40px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.5); width: 450px; }
                    h1 { font-size: 2.5em; margin: 0 0 10px 0; }
                    p { font-size: 1.1em; color: #cdd6f4; margin: 5px 0; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>✅ Login Successful!</h1>
                    <p>The YouTube Agent Service has been authorized.</p>
                    <p style="color: #a6adc8; font-size: 0.9em; margin-top: 15px;">You can safely close this browser window now.</p>
                </div>
            </body>
        </html>
        """
    except Exception as e:
        return f"""
        <html>
            <head>
                <title>Authorization Failed</title>
                <style>
                    body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; margin-top: 100px; background-color: #1e1e2e; color: #f38ba8; }}
                    .card {{ background-color: #313244; padding: 40px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.5); width: 450px; }}
                    a {{ display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #89b4fa; color: #11111b; text-decoration: none; border-radius: 6px; font-weight: bold; }}
                </style>
            </head>
            <body>
                <div class="card">
                    <h1 style="margin: 0 0 10px 0;">❌ Authentication Failed</h1>
                    <p style="color: #cdd6f4;">Failed to exchange authorization code for tokens.</p>
                    <p style="color: #a6adc8; font-size: 0.9em; font-style: italic;">{str(e)}</p>
                    <a href="/youtube/login">Try Again</a>
                </div>
            </body>
        </html>
        """

@app.get("/youtube/login-status")
def youtube_login_status():
    """
    Returns whether the YouTube Agent is currently authorized.
    """
    has_token = bool(youtube_uploader_agent.get_stored_refresh_token())
    return {
        "authorized": has_token,
        "status": "AUTHORIZED" if has_token else "NOT_AUTHORIZED",
        "loginUrl": "http://localhost:8090/youtube/login"
    }

