import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('Seeding database...');

  // 1. Clear existing users to clean database as requested
  console.log('Clearing existing users...');
  await prisma.user.deleteMany({});

  // 2. Seed new admin & superadmin accounts
  const adminPasswordHash = hashPassword('admin123');
  await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@investingatti.com',
      passwordHash: adminPasswordHash,
      role: 'SUPERUSER',
      subscriptionPlan: 'FREE',
      isActive: true,
    },
  });
  console.log('Created user: admin | role: SUPERUSER');

  const superadminPasswordHash = hashPassword('superadmin123');
  await prisma.user.create({
    data: {
      username: 'superadmin',
      email: 'superadmin@investingatti.com',
      passwordHash: superadminPasswordHash,
      role: 'SUPERUSER',
      subscriptionPlan: 'FREE',
      isActive: true,
    },
  });
  console.log('Created user: superadmin | role: SUPERUSER');

  // Default risk settings
  await prisma.riskSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      maxPositionSizePct: 5.0,
      maxLossPerTradePct: 2.0,
      minRiskReward: 1.5,
      requireStopLoss: true,
      blockDuplicateWindow: 24,
      paperTradingOnly: true,
      maxDailyOrders: 10,
    },
  });

  // Initialize API connection status records
  const services = ['openai', 'alpaca_data', 'postgres', 'redis'];
  for (const service of services) {
    await prisma.apiConnectionStatus.upsert({
      where: { service },
      update: {},
      create: {
        service,
        status: 'unchecked',
        message: 'Not yet tested',
      },
    });
  }

  // Sample watchlist
  const defaultSymbols = ['AAPL', 'NVDA', 'SPY'];
  for (const symbol of defaultSymbols) {
    await prisma.watchlist.upsert({
      where: { symbol },
      update: {},
      create: { symbol },
    });
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
