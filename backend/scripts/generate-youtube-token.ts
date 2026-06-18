/**
 * ONE-TIME SETUP SCRIPT: YouTube OAuth Refresh Token Generator
 *
 * Run this once on your local machine to get a long-lived refresh token.
 * Then add YOUTUBE_REFRESH_TOKEN to your production .env
 *
 * Prerequisites:
 *   1. Create a Google Cloud project (or use existing one)
 *   2. Enable "YouTube Data API v3"
 *   3. Create OAuth 2.0 credentials (Desktop App type)
 *   4. Add to .env:
 *        YOUTUBE_CLIENT_ID=...
 *        YOUTUBE_CLIENT_SECRET=...
 *
 * Usage:
 *   npx ts-node scripts/generate-youtube-token.ts
 */

import * as http from 'http';
import * as url from 'url';
import * as readline from 'readline';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3999/oauth2callback';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
].join(' ');

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET in .env');
    process.exit(1);
  }

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  console.log('\n=== YouTube OAuth Token Setup ===\n');
  console.log('1. Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n2. Authorize the app with your YouTube channel account.');
  console.log('3. You will be redirected to localhost:3999 — this script handles that.\n');

  // Start local HTTP server to capture the OAuth callback
  const code = await waitForCode();

  console.log('\n✅ Got authorization code. Exchanging for tokens...');

  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const { access_token, refresh_token } = tokenRes.data;

  console.log('\n=== ✅ SUCCESS ===\n');
  console.log('Add these to your .env file (and production server .env):\n');
  console.log(`YOUTUBE_REFRESH_TOKEN=${refresh_token}`);
  console.log(`\n(Access token for testing: ${access_token})\n`);

  if (!refresh_token) {
    console.warn('⚠️  No refresh_token received. Make sure you added prompt=consent to get a fresh token.');
  }

  process.exit(0);
}

function waitForCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsed = url.parse(req.url || '', true);
      const code = parsed.query.code as string;
      const error = parsed.query.error as string;

      if (error) {
        res.end(`<h2>Error: ${error}</h2><p>Close this tab and check the terminal.</p>`);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (code) {
        res.end('<h2>✅ Authorization successful!</h2><p>You can close this tab now.</p>');
        server.close();
        resolve(code);
      } else {
        res.end('<h2>Waiting for authorization...</h2>');
      }
    });

    server.listen(3999, () => {
      console.log('Listening for OAuth callback on http://localhost:3999 ...');
    });

    server.on('error', reject);
  });
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
