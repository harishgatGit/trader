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

  // Seed default superusers
  const adminPasswordHash = hashPassword('admin123');
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'SUPERUSER',
    },
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'SUPERUSER',
    },
  });

  const harishPasswordHash = hashPassword('260519');
  await prisma.user.upsert({
    where: { username: 'harish' },
    update: {
      passwordHash: harishPasswordHash,
      role: 'SUPERUSER',
    },
    create: {
      username: 'harish',
      passwordHash: harishPasswordHash,
      role: 'SUPERUSER',
    },
  });

  const sidPasswordHash = hashPassword('sid123');
  await prisma.user.upsert({
    where: { username: 'sid' },
    update: {
      passwordHash: sidPasswordHash,
      role: 'BASIC',
    },
    create: {
      username: 'sid',
      passwordHash: sidPasswordHash,
      role: 'BASIC',
    },
  });

  const sriniPasswordHash = hashPassword('srini123');
  await prisma.user.upsert({
    where: { username: 'srini' },
    update: {
      passwordHash: sriniPasswordHash,
      role: 'BASIC',
    },
    create: {
      username: 'srini',
      passwordHash: sriniPasswordHash,
      role: 'BASIC',
    },
  });

  const navinaPasswordHash = hashPassword('navina123');
  await prisma.user.upsert({
    where: { username: 'navina' },
    update: {
      passwordHash: navinaPasswordHash,
      role: 'BASIC',
    },
    create: {
      username: 'navina',
      passwordHash: navinaPasswordHash,
      role: 'BASIC',
    },
  });

  const arulPasswordHash = hashPassword('arul123');
  await prisma.user.upsert({
    where: { username: 'arul' },
    update: {
      passwordHash: arulPasswordHash,
      role: 'BASIC',
    },
    create: {
      username: 'arul',
      passwordHash: arulPasswordHash,
      role: 'BASIC',
    },
  });

  const sundarPasswordHash = hashPassword('sundar123');
  await prisma.user.upsert({
    where: { username: 'sundar' },
    update: {
      passwordHash: sundarPasswordHash,
      role: 'BASIC',
    },
    create: {
      username: 'sundar',
      passwordHash: sundarPasswordHash,
      role: 'BASIC',
    },
  });

  const tailPasswordHash = hashPassword('trail123');
  await prisma.user.upsert({
    where: { username: 'tail' },
    update: {
      passwordHash: tailPasswordHash,
      role: 'BASIC',
    },
    create: {
      username: 'tail',
      passwordHash: tailPasswordHash,
      role: 'BASIC',
    },
  });

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
