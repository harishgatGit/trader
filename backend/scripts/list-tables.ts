import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.$queryRaw<any[]>`SELECT column_name FROM information_schema.columns WHERE table_name='alerts' ORDER BY ordinal_position`;
  console.log('alerts:', r.map((c:any)=>c.column_name).join(', '));
}
main().catch(console.error).finally(() => prisma.$disconnect());
