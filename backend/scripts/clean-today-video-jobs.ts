import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.videoGenerationJob.deleteMany({
    where: {
      reportDate: '2026-06-27',
      status: 'RECEIVED'
    }
  });

  console.log(`\nDeleted ${result.count} video jobs for today in RECEIVED state.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
