/**
 * wait-and-upload.js
 *
 * Waits for all 2026-06-30 video generation jobs to finish,
 * then triggers YouTube uploads ONE-BY-ONE via the NestJS YouTube
 * agent service (port 8095).
 *
 * Rules:
 *  - Title date will show "06/29/2026" (passed as reportDate override)
 *  - Skip already UPLOADED jobs (no duplicates)
 *  - NO retries on upload error
 *  - Max 20 uploads total
 *  - No looping / no recursive calls
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

const REPORT_DATE      = '2026-06-30';  // actual DB date (used to find jobs)
const TITLE_DATE       = '2026-06-29';  // date shown in YouTube title
const SERVICE_URL      = 'http://localhost:8095';
const API_KEY          = 'investingatti-youtube-key-dev';
const MAX_UPLOADS      = 20;
const POLL_INTERVAL_MS = 30_000;        // check every 30 s

// ─── helpers ────────────────────────────────────────────────────────────────

async function getJobs() {
  return prisma.videoGenerationJob.findMany({
    where: { reportDate: REPORT_DATE },
    orderBy: { ticker: 'asc' },
  });
}

function summarise(jobs) {
  const counts = {};
  jobs.forEach(j => { counts[j.status] = (counts[j.status] || 0) + 1; });
  return Object.entries(counts).map(([s, n]) => `${s}:${n}`).join('  ');
}

function allDone(jobs) {
  const active = jobs.filter(j => !['GENERATED', 'FAILED', 'ERROR', 'NOT_ELIGIBLE'].includes(j.status));
  return active.length === 0;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Wait-and-Upload for ${REPORT_DATE} ===`);
  console.log(`  Title date override → ${TITLE_DATE}`);
  console.log(`  Max uploads: ${MAX_UPLOADS}`);
  console.log(`  No retries on error.\n`);

  // ── 1. Wait for all video jobs to finish ──────────────────────────
  console.log('Waiting for all video generation jobs to complete...\n');
  let jobs;
  while (true) {
    jobs = await getJobs();
    const status = summarise(jobs);
    console.log(`  [${new Date().toLocaleTimeString()}] ${status}`);

    if (allDone(jobs)) {
      console.log('\n✅ All jobs finished. Proceeding to upload.\n');
      break;
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  // ── 2. Build upload list ──────────────────────────────────────────
  const toUpload = jobs.filter(j =>
    j.status === 'GENERATED' &&
    j.finalVideoPath &&
    j.youtubeUploadStatus !== 'UPLOADED'  // skip already uploaded
  ).slice(0, MAX_UPLOADS);

  console.log(`Videos eligible for upload: ${toUpload.length}`);
  if (toUpload.length === 0) {
    console.log('Nothing to upload. Exiting.');
    return;
  }

  // ── 3. Check YouTube service is authorised ────────────────────────
  try {
    const ls = await axios.get(`${SERVICE_URL}/login-status`, { timeout: 5000 });
    if (!ls.data?.authorized) {
      console.error(`❌ YouTube service is NOT authorised. Visit ${SERVICE_URL}/login to log in first.`);
      return;
    }
    console.log('✅ YouTube service is authorised.\n');
  } catch (e) {
    console.error(`❌ Cannot reach YouTube service at ${SERVICE_URL}: ${e.message}`);
    return;
  }

  // ── 4. Upload one-by-one, no retries ─────────────────────────────
  let uploaded = 0;
  let failed   = 0;
  let skipped  = 0;

  for (const job of toUpload) {
    // Re-read DB state in case anything changed while we were waiting
    const fresh = await prisma.videoGenerationJob.findUnique({
      where: { id: job.id },
    });

    if (fresh?.youtubeUploadStatus === 'UPLOADED') {
      console.log(`  [${job.ticker}] Already UPLOADED — skipping.`);
      skipped++;
      continue;
    }

    if (fresh?.youtubeUploadStatus === 'UPLOADING') {
      console.log(`  [${job.ticker}] Currently UPLOADING by another process — skipping.`);
      skipped++;
      continue;
    }

    const payload = {
      jobId:      `upload-${job.ticker}-${REPORT_DATE}`,
      ticker:     job.ticker,
      reportDate: TITLE_DATE,          // ← title will show 06/29/2026
      videoPath:  job.finalVideoPath,
      reportData: {},
      visibility: 'public',
    };

    console.log(`  [${job.ticker}] Queuing upload...`);
    try {
      const res = await axios.post(`${SERVICE_URL}/upload`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        timeout: 15_000,
      });
      console.log(`  [${job.ticker}] ✅ Queued — ${JSON.stringify(res.data)}`);
      uploaded++;

      // Small gap between requests to avoid hammering the API
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      const detail = err.response?.data || err.message;
      console.error(`  [${job.ticker}] ❌ Failed to queue: ${JSON.stringify(detail)}`);
      failed++;
      // NO RETRY — move on
    }
  }

  console.log(`\n=== Upload Summary ===`);
  console.log(`  Queued:  ${uploaded}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`\nDone. Monitor the YouTube service logs for actual upload progress.`);
}

main()
  .catch(e => console.error('Fatal error:', e))
  .finally(() => prisma.$disconnect());
