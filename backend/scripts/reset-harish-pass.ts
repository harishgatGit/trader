import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const username = 'harish';
  const newPassword = '260519'; // The password from seed.ts

  const existing = await prisma.user.findUnique({ where: { username } });

  if (!existing) {
    console.log(`User "${username}" not found. Creating brand new...`);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(newPassword),
        role: 'SUPERUSER',
      },
    });
    console.log(`✅ Created user "${user.username}" with role: ${user.role} and password: "${newPassword}"`);
  } else {
    console.log(`User "${username}" found. Resetting password...`);
    const user = await prisma.user.update({
      where: { username },
      data: {
        passwordHash: hashPassword(newPassword),
        role: 'SUPERUSER', // Ensure SUPERUSER role is active
      },
    });
    console.log(`✅ Reset password for user "${user.username}" to: "${newPassword}" (Role: ${user.role})`);
  }
}

main()
  .catch((e) => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
