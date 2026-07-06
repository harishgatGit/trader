import os
import json
from pathlib import Path
from app.config import YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_UPLOAD_VISIBILITY, BASE_DIR
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow

class YouTubeUploaderAgent:
    def __init__(self):
        self.credentials = None
        self.tokens_path = BASE_DIR / "tokens.json"

    def get_stored_refresh_token(self) -> str:
        """Loads refresh token from local storage if available."""
        if self.tokens_path.exists():
            try:
                with open(self.tokens_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("refresh_token")
            except Exception as e:
                print(f"[YouTubeUploaderAgent] Error reading stored tokens: {e}")
        return None

    def store_tokens(self, refresh_token: str, access_token: str = None):
        """Persists the refresh token to local storage."""
        try:
            self.tokens_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.tokens_path, "w", encoding="utf-8") as f:
                json.dump({
                    "refresh_token": refresh_token,
                    "access_token": access_token
                }, f, indent=2)
            print(f"[YouTubeUploaderAgent] Tokens successfully saved to {self.tokens_path}")
        except Exception as e:
            print(f"[YouTubeUploaderAgent] Failed to store tokens: {e}")

    def get_credentials(self, refresh_token: str = None, auth_code: str = None) -> Credentials:
        if not YOUTUBE_CLIENT_ID or not YOUTUBE_CLIENT_SECRET:
            raise ValueError("YouTube OAuth environment variables YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET must be configured.")

        # 1. Exchange auth code if provided
        if auth_code:
            print("[YouTubeUploaderAgent] Exchanging auth code for tokens...")
            flow = Flow.from_client_config(
                client_config={
                    "web": {
                        "client_id": YOUTUBE_CLIENT_ID,
                        "client_secret": YOUTUBE_CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                    }
                },
                scopes=["https://www.googleapis.com/auth/youtube.upload"]
            )
            # Match redirect URI to the local service callback route
            flow.redirect_uri = "http://localhost:8090/youtube/oauth2callback"
            flow.fetch_token(code=auth_code)
            self.credentials = flow.credentials
            
            if self.credentials.refresh_token:
                self.store_tokens(self.credentials.refresh_token, self.credentials.token)
            return self.credentials

        # 2. Use passed or stored refresh token
        token_to_use = refresh_token or self.get_stored_refresh_token()
        if token_to_use:
            print("[YouTubeUploaderAgent] Initializing credentials from refresh token...")
            self.credentials = Credentials(
                token=None,
                refresh_token=token_to_use,
                client_id=YOUTUBE_CLIENT_ID,
                client_secret=YOUTUBE_CLIENT_SECRET,
                token_uri="https://oauth2.googleapis.com/token",
                scopes=["https://www.googleapis.com/auth/youtube.upload"]
            )
            self.credentials.refresh(Request())
            return self.credentials

        raise ValueError("No authorization credentials available. Please navigate to http://localhost:8090/youtube/login to authenticate YouTube service.")

    def upload(
        self,
        file_path: str,
        title: str,
        description: str,
        tags: list,
        refresh_token: str = None,
        auth_code: str = None,
        visibility: str = None
    ) -> str:
        """
        Uploads an MP4 video file to YouTube via resumable upload using dynamic or stored credentials.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Video file not found at: {file_path}")

        creds = self.get_credentials(refresh_token=refresh_token, auth_code=auth_code)
        youtube = build("youtube", "v3", credentials=creds)

        vis = visibility or YOUTUBE_UPLOAD_VISIBILITY or "private"
        body = {
            "snippet": {
                "title": title,
                "description": description,
                "tags": tags,
                "categoryId": "25",
                "defaultLanguage": "en"
            },
            "status": {
                "privacyStatus": vis,
                "selfDeclaredMadeForKids": False
            }
        }

        media = MediaFileUpload(file_path, mimetype="video/mp4", chunksize=1024*1024, resumable=True)
        request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

        print(f"[YouTubeUploaderAgent] Starting chunked upload for {file_path}...")
        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                print(f"[YouTubeUploaderAgent] Upload progress: {int(status.progress() * 100)}%")

        video_id = response.get("id")
        if not video_id:
            raise ValueError(f"Upload completed but no video ID was returned: {response}")

        print(f"[YouTubeUploaderAgent] Upload successful! Video ID: {video_id}")
        return video_id
