import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const todayJobs = await prisma.videoGenerationJob.findMany({
    where: {
      reportDate: '2026-06-27'
    },
    select: {
      ticker: true,
      status: true,
      errorMessage: true,
      createdAt: true
    }
  });

  console.log('\n=== Today\'s Video Jobs ===');
  console.table(todayJobs.map(j => ({
    ...j,
    createdAt: j.createdAt.toISOString()
  })));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
