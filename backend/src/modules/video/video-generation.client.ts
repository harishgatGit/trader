import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface VideoJobPayload {
  ticker: string;
  reportDate: string;
  reportId: string;
  reportJson: any;
  outputFolder?: string;
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

  async triggerVideoJob(payload: VideoJobPayload): Promise<VideoJobResponse> {
    const url = `${this.baseUrl}/video-jobs`;
    this.logger.log(`Triggering video generation job for ${payload.ticker} at ${url}`);
    
    try {
      const response = await axios.post<VideoJobResponse>(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        timeout: 10000, // 10s timeout, response is immediate
      });
      return response.data;
    } catch (err: any) {
      this.logger.error(`Failed to trigger video generation job for ${payload.ticker}: ${err.message}`);
      throw err;
    }
  }

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
