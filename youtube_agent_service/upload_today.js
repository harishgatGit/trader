const fs = require('fs');
const path = require('path');
const http = require('http');

// Get date from arguments or default to today (formatted as YYYY-MM-DD in local time)
const getLocalDateString = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const targetDate = process.argv[2] || getLocalDateString();
const videoBaseDir = path.resolve(__dirname, '../video_agents_service/outputs/videos', targetDate);
const serviceUrl = 'http://localhost:8095';
const apiKey = 'investingatti-youtube-key-dev';

console.log(`=== Scanning generated videos for date: ${targetDate} ===`);
console.log(`Base directory: ${videoBaseDir}\n`);

if (!fs.existsSync(videoBaseDir)) {
  console.error(`Error: Directory for date ${targetDate} does not exist at ${videoBaseDir}`);
  process.exit(1);
}

const sendUploadRequest = (payload) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${serviceUrl}/upload`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 202) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP Status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(JSON.stringify(payload));
    req.end();
  });
};

const run = async () => {
  const tickers = fs.readdirSync(videoBaseDir).filter(file => {
    return fs.statSync(path.join(videoBaseDir, file)).isDirectory();
  });

  console.log(`Found ${tickers.length} ticker folder(s) for ${targetDate}.\n`);

  let queuedCount = 0;

  for (const ticker of tickers) {
    const tickerDir = path.join(videoBaseDir, ticker);
    const videoPath = path.join(tickerDir, 'final-video.mp4');
    const reportPath = path.join(tickerDir, 'source-report.json');

    if (!fs.existsSync(videoPath)) {
      console.log(`  [${ticker}] ⚠️  final-video.mp4 not found — skipping`);
      continue;
    }

    if (!fs.existsSync(reportPath)) {
      console.log(`  [${ticker}] ⚠️  source-report.json not found — skipping`);
      continue;
    }

    let reportJson = {};
    try {
      const fileContent = fs.readFileSync(reportPath, 'utf8');
      reportJson = JSON.parse(fileContent);
    } catch (parseErr) {
      console.warn(`  [${ticker}] ⚠️  Failed to parse source-report.json: ${parseErr.message}`);
    }

    // Extract rating and summary from reportJson
    const rating = reportJson.finalRating || 'ANALYZED';
    const summary = reportJson.executiveSummary || `AI-powered stock analysis for ${ticker} on ${targetDate}`;

    const payload = {
      jobId: `youtube-upload-${ticker}-${targetDate}`,
      ticker: ticker,
      reportDate: targetDate,
      videoPath: videoPath,
      reportData: {
        finalRating: rating,
        executiveSummary: summary,
        reportJson: reportJson
      },
      visibility: 'public'
    };

    console.log(`  [${ticker}] Queuing to YouTube agent service...`);
    try {
      const response = await sendUploadRequest(payload);
      console.log(`  [${ticker}] ✓ Queued successfully (jobId: ${response.jobId || 'none'})`);
      queuedCount++;
    } catch (err) {
      console.error(`  [${ticker}] ❌ Failed to queue: ${err.message}`);
    }

    // Small delay between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n=== Done! Queued ${queuedCount} video(s) for upload to YouTube. ===`);
};

run().catch(console.error);
