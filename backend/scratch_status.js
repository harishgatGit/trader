const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const date = '2026-07-02';
  const jobs = await prisma.videoGenerationJob.findMany({
    where: { reportDate: date },
    orderBy: { ticker: 'asc' },
  });

  console.log(`\n=== Video Generation & YouTube Upload Status for ${date} ===`);
  jobs.forEach(j => {
    console.log(`Ticker: ${j.ticker.padEnd(6)} | Status: ${j.status.padEnd(20)} | YT Upload: ${(j.youtubeUploadStatus || 'PENDING').padEnd(10)} | YT URL: ${j.youtubeUrl || 'None'}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
