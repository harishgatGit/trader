/**
 * Seed script: creates default user "tail" with password "trail123" (BASIC role)
 * Run: npx ts-node scripts/seed-user.ts
 */
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const username = 'tail';
  const password = 'trail123';
  const role = 'BASIC';

  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    console.log(`✅  User "${username}" already exists (id: ${existing.id})`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashPassword(password),
      role,
    },
  });

  console.log(`✅  Created user: ${user.username} | role: ${user.role} | id: ${user.id}`);
}

main()
  .catch((e) => { console.error('❌  Seed failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
