import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface VideoJobPayload {
  ticker: string;
  reportDate: string;
  reportId: string;
  reportJson: any;
  forceRegenerate?: boolean;
}

export interface VideoJobResponse {
  jobId: string;
  reportId: string;
  ticker: string;
  reportDate: string;
  status: string;
  errorMessage?: string;
  videoUrl?: string;
  artifacts?: any;
}

@Injectable()
export class VideoGenerationClient {
  private readonly logger = new Logger(VideoGenerationClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.VIDEO_SERVICE_URL || 'http://localhost:8090';
    this.apiKey = process.env.VIDEO_SERVICE_API_KEY || 'your-key';
  }

  /**
   * Fires a video job request to the Python video agent service without
   * blocking the caller. All errors are caught and logged internally.
   * Backend will never fail or be delayed because of this call.
   */
  triggerVideoJobFireAndForget(payload: VideoJobPayload): void {
    const url = `${this.baseUrl}/video-jobs`;
    this.logger.log(`[fire-and-forget] Triggering video job for ${payload.ticker} at ${url}`);

    axios
      .post<VideoJobResponse>(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        timeout: 10000, // 10s — response is immediate (service just queues)
      })
      .then((res) => {
        this.logger.log(`[fire-and-forget] Video job accepted for ${payload.ticker}: status=${res.data.status}`);
      })
      .catch((err: any) => {
        // Swallow ALL errors — video service down must not impact backend
        const msg = err?.response?.data?.detail || err?.message || 'Unknown error';
        this.logger.warn(`[fire-and-forget] Video service call failed for ${payload.ticker} (non-fatal): ${msg}`);
      });
  }

  /**
   * Retries a failed video job by calling the Python service retry endpoint.
   * This IS awaited (used from the retry controller endpoint).
   */
  async retryVideoJob(jobId: string): Promise<VideoJobResponse> {
    const url = `${this.baseUrl}/video-jobs/${jobId}/retry`;
    this.logger.log(`Retrying video generation job ${jobId} at ${url}`);

    try {
      const response = await axios.post<VideoJobResponse>(url, {}, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        timeout: 10000,
      });
      return response.data;
    } catch (err: any) {
      this.logger.error(`Failed to retry video generation job ${jobId}: ${err.message}`);
      throw err;
    }
  }
}
