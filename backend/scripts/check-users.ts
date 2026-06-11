import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    }
  });

  console.log('--- REGISTERED USERS ---');
  if (users.length === 0) {
    console.log('No users found in database.');
  } else {
    users.forEach((u) => {
      console.log(`ID: ${u.id} | Username: "${u.username}" | Role: ${u.role} | Created: ${u.createdAt}`);
    });
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
