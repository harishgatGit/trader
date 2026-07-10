/**
 * upload-generated-now.js
 *
 * Uploads all GENERATED videos for a given reportDate to YouTube.
 *
 * IMPORTANT: reportDate in the payload MUST be YYYY-MM-DD (same as DB)
 * so the YouTube service can look up the record and prevent duplicate uploads.
 * The service's fmtDate() converts it to MM/DD/YYYY automatically for the title.
 *
 * Rules: Max 20 | No retries | Skip already UPLOADED or UPLOADING
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

const REPORT_DATE = '2026-06-30';              // YYYY-MM-DD — must match DB
const SERVICE_URL = 'http://localhost:8095';
const API_KEY     = 'investingatti-youtube-key-dev';
const MAX_UPLOADS = 20;

async function main() {
  console.log(`\n=== Upload Generated Videos ===`);
  console.log(`  Date: ${REPORT_DATE} | Max: ${MAX_UPLOADS} | No retries\n`);

  // Fetch all GENERATED jobs with a finalVideoPath
  const allGenerated = await prisma.videoGenerationJob.findMany({
    where: {
      reportDate: REPORT_DATE,
      status: 'GENERATED',
      finalVideoPath: { not: null },
    },
    orderBy: { ticker: 'asc' },
  });

  // Filter in JS to correctly handle null youtubeUploadStatus
  const jobs = allGenerated
    .filter(j => j.youtubeUploadStatus !== 'UPLOADED' && j.youtubeUploadStatus !== 'UPLOADING')
    .slice(0, MAX_UPLOADS);

  console.log(`All GENERATED with path: ${allGenerated.length}`);
  console.log(`Eligible (not yet uploaded): ${jobs.length}`);
  console.log(`Tickers: ${jobs.map(j => j.ticker).join(', ')}\n`);

  if (jobs.length === 0) {
    console.log('Nothing to upload. Exiting.');
    return;
  }

  // Verify YouTube service auth
  try {
    const ls = await axios.get(`${SERVICE_URL}/login-status`, { timeout: 5000 });
    if (!ls.data?.authorized) {
      console.error(`❌ YouTube service NOT authorized. Visit ${SERVICE_URL}/login`);
      return;
    }
    console.log('✅ YouTube service is authorized.\n');
  } catch (e) {
    console.error(`❌ Cannot reach YouTube service: ${e.message}`);
    return;
  }

  let queued = 0, failed = 0, skipped = 0;

  for (const job of jobs) {
    // Fresh DB check right before queuing — prevent races
    const fresh = await prisma.videoGenerationJob.findUnique({ where: { id: job.id } });
    if (fresh?.youtubeUploadStatus === 'UPLOADED' || fresh?.youtubeUploadStatus === 'UPLOADING') {
      console.log(`  [${job.ticker}] Already ${fresh.youtubeUploadStatus} — skipping.`);
      skipped++;
      continue;
    }

    const payload = {
      jobId:      `upload-${job.ticker}-${REPORT_DATE}-${Date.now()}`,
      ticker:     job.ticker,
      reportDate: REPORT_DATE,   // ← MUST be YYYY-MM-DD so DB guard works
      videoPath:  job.finalVideoPath,
      reportData: {},
      visibility: 'public',
    };

    console.log(`  [${job.ticker}] Queuing...`);
    try {
      const res = await axios.post(`${SERVICE_URL}/upload`, payload, {
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        timeout: 15_000,
      });
      console.log(`  [${job.ticker}] ✅ Queued → ${JSON.stringify(res.data)}`);
      queued++;
      await new Promise(r => setTimeout(r, 3000));  // 3s gap
    } catch (err) {
      console.error(`  [${job.ticker}] ❌ Error: ${JSON.stringify(err.response?.data || err.message)}`);
      failed++;
      // NO RETRY
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Queued:  ${queued}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`\nMonitor YouTube service logs for upload progress.`);
}

main()
  .catch(e => console.error('Fatal:', e))
  .finally(() => prisma.$disconnect());
