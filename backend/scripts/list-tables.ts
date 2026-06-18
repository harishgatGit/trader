import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Get actual column names from search_logs
  const cols = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'search_logs' ORDER BY ordinal_position
  `;
  console.log('search_logs columns:', cols.map(c => c.column_name).join(', '));

  const agentCols = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'agent_reports' ORDER BY ordinal_position
  `;
  console.log('agent_reports columns:', agentCols.map(c => c.column_name).join(', '));
}
main().catch(console.error).finally(() => prisma.$disconnect());
