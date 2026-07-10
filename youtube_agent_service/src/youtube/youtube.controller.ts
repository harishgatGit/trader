import { Controller, Get, Post, Body, Headers, HttpCode, UnauthorizedException, Res, Query, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { YoutubeService } from './youtube.service';
import { ConfigService } from '@nestjs/config';

@Controller()
export class YoutubeController {
  private readonly logger = new Logger(YoutubeController.name);

  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly configService: ConfigService,
  ) {}

  @Get('health')
  healthCheck() {
    return { status: 'ok', service: 'InvestingAtti YouTube Agent Service (Node/NestJS)' };
  }

  @Get('login')
  login(@Res() res: Response) {
    const authUrl = this.youtubeService.getAuthUrl();
    return res.redirect(authUrl);
  }

  @Get('oauth2callback')
  async oauth2callback(
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('error') error?: string,
  ) {
    if (error) {
      this.logger.error(`OAuth error callback received: ${error}`);
      res.setHeader('Content-Type', 'text/html');
      return res.status(400).send(`
        <html>
            <head>
                <title>Authorization Failed</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; margin-top: 100px; background-color: #1e1e2e; color: #f38ba8; }
                    .card { background-color: #313244; padding: 40px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                    a { display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #89b4fa; color: #11111b; text-decoration: none; border-radius: 6px; font-weight: bold; }
                    a:hover { background-color: #b4befe; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1 style="font-size: 2.5em; margin: 0 0 10px 0;">❌ OAuth Error</h1>
                    <p style="font-size: 1.2em; color: #cdd6f4;">${error}</p>
                    <a href="/login">Try Login Again</a>
                </div>
            </body>
        </html>
      `);
    }

    if (!code) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(400).send('Authorization code is missing.');
    }

    try {
      await this.youtubeService.exchangeCodeForTokens(code);
      res.setHeader('Content-Type', 'text/html');
      return res.send(`
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
      `);
    } catch (err: any) {
      this.logger.error(`Failed to exchange code: ${err.message}`);
      res.setHeader('Content-Type', 'text/html');
      return res.status(500).send(`
        <html>
            <head>
                <title>Authorization Failed</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; margin-top: 100px; background-color: #1e1e2e; color: #f38ba8; }
                    .card { background-color: #313244; padding: 40px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.5); width: 450px; }
                    a { display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #89b4fa; color: #11111b; text-decoration: none; border-radius: 6px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1 style="margin: 0 0 10px 0;">❌ Authentication Failed</h1>
                    <p style="color: #cdd6f4;">Failed to exchange authorization code for tokens.</p>
                    <p style="color: #a6adc8; font-size: 0.9em; font-style: italic;">${err.message}</p>
                    <a href="/login">Try Again</a>
                </div>
            </body>
        </html>
      `);
    }
  }

  @Get('login-status')
  async loginStatus() {
    const hasToken = await this.youtubeService.isAuthorized();
    const port = this.configService.get<number>('port') || 8095;
    return {
      authorized: hasToken,
      status: hasToken ? 'AUTHORIZED' : 'NOT_AUTHORIZED',
      loginUrl: `http://localhost:${port}/login`,
    };
  }

  @Post('upload')
  @HttpCode(202)
  uploadVideo(
    @Body() body: any,
    @Headers('x-api-key') xApiKey: string,
  ) {
    const serviceApiKey = this.configService.get<string>('youtube.serviceApiKey');
    if (serviceApiKey && xApiKey !== serviceApiKey) {
      throw new UnauthorizedException('Invalid or missing API key header (x-api-key)');
    }

    // Process task in background
    this.youtubeService.processUploadTask(body).catch((err) => {
      this.logger.error(`Background upload task failed for job ${body.jobId}: ${err.message}`);
    });

    return { status: 'queued', jobId: body.jobId };
  }
}
