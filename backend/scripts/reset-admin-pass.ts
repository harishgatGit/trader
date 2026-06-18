import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const accounts = [
    { username: 'admin', password: 'Admin@2025' },
    { username: 'superadmin', password: 'Admin@2025' },
  ];

  for (const { username, password } of accounts) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) {
      console.log(`⚠️  User "${username}" not found — skipping`);
      continue;
    }
    await prisma.user.update({
      where: { username },
      data: { passwordHash: hashPassword(password), role: 'SUPERUSER' },
    });
    console.log(`✅  Reset password for "${username}" → "${password}" (SUPERUSER)`);
  }
}

main()
  .catch((e) => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
