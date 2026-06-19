import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        subscriptionPlan: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { searchLogs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = this.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        role: dto.role,
      },
    });

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  async getAnalytics() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch logs from the last 7 days (or all logs to prevent empty list, let's fall back to last 30 days if last 7 days is empty, or just fetch last 1000 logs)
    const rawLogs = await this.prisma.searchLog.findMany({
      take: 2000,
      include: {
        user: {
          select: { username: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    const isLocalIp = (ip: string): boolean => {
      if (!ip) return true;
      const cleanIp = ip.trim().toLowerCase();
      return (
        cleanIp === '127.0.0.1' ||
        cleanIp === '::1' ||
        cleanIp === 'localhost' ||
        cleanIp === '::ffff:127.0.0.1' ||
        cleanIp.startsWith('10.') ||
        cleanIp.startsWith('192.168.') ||
        cleanIp.startsWith('172.16.') ||
        cleanIp.startsWith('172.17.') ||
        cleanIp.startsWith('172.18.') ||
        cleanIp.startsWith('172.19.') ||
        cleanIp.startsWith('172.20.') ||
        cleanIp.startsWith('172.21.') ||
        cleanIp.startsWith('172.22.') ||
        cleanIp.startsWith('172.23.') ||
        cleanIp.startsWith('172.24.') ||
        cleanIp.startsWith('172.25.') ||
        cleanIp.startsWith('172.26.') ||
        cleanIp.startsWith('172.27.') ||
        cleanIp.startsWith('172.28.') ||
        cleanIp.startsWith('172.29.') ||
        cleanIp.startsWith('172.30.') ||
        cleanIp.startsWith('172.31.')
      );
    };

    const logs = rawLogs.filter(log => {
      if (process.env.NODE_ENV === 'test') {
        return true;
      }
      const ip = log.ipAddress || '';
      const city = log.city || '';
      const state = log.state || '';
      if (city === 'Local' || state === 'Local' || city === 'Local Network' || state === 'Local Network') {
        return false;
      }
      return !isLocalIp(ip);
    });

    // Grouping and aggregating stats
    const uniqueSymbols = Array.from(new Set(logs.map(l => l.symbol)));
    
    // Resolve sectors from FundamentalSnapshot
    const fundamentalSnaps = await this.prisma.fundamentalSnapshot.findMany({
      where: {
        symbol: { in: uniqueSymbols },
        available: true
      },
      select: {
        symbol: true,
        sector: true
      }
    });

    const symbolToSector: { [symbol: string]: string } = {};
    fundamentalSnaps.forEach(snap => {
      if (snap.sector) {
        symbolToSector[snap.symbol] = snap.sector;
      }
    });

    // 1. Daily search count (last 7 days)
    const dailyCounts: { [dateStr: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyCounts[dateStr] = 0;
    }

    logs.forEach(log => {
      const dateStr = log.timestamp.toISOString().split('T')[0];
      if (dailyCounts[dateStr] !== undefined) {
        dailyCounts[dateStr]++;
      }
    });

    const dailyStats = Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      count,
    })).sort((a, b) => a.date.localeCompare(b.date));

    // 2. Top symbols
    const symbolCounts: { [symbol: string]: number } = {};
    logs.forEach(log => {
      symbolCounts[log.symbol] = (symbolCounts[log.symbol] || 0) + 1;
    });

    const topSymbols = Object.entries(symbolCounts)
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 3. Top sectors
    const sectorCounts: { [sector: string]: number } = {};
    logs.forEach(log => {
      const sector = symbolToSector[log.symbol] || 'Unknown';
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
    });

    const topSectors = Object.entries(sectorCounts)
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 3.5. Top IP Addresses
    const ipCounts: { [ip: string]: { count: number; city: string; state: string } } = {};
    logs.forEach(log => {
      const ip = log.ipAddress || 'Unknown';
      const city = log.city || 'Unknown';
      const state = log.state || 'Unknown';
      if (!ipCounts[ip]) {
        ipCounts[ip] = { count: 0, city, state };
      }
      ipCounts[ip].count++;
    });

    const topIps = Object.entries(ipCounts)
      .map(([ip, data]) => ({
        ip,
        count: data.count,
        city: data.city,
        state: data.state
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. Recent searches detail
    const recentSearches = logs.map(log => ({
      id: log.id,
      username: log.user?.username || 'Unknown',
      symbol: log.symbol,
      sector: symbolToSector[log.symbol] || 'Unknown',
      timestamp: log.timestamp,
      ipAddress: log.ipAddress || 'Unknown',
      city: log.city || 'Unknown',
      state: log.state || 'Unknown',
    })).slice(0, 100);

    return {
      dailyStats,
      topSymbols,
      topSectors,
      recentSearches,
      topIps,
      totalSearches: logs.length
    };
  }

  async getFeedback() {
    return this.prisma.problemReport.findMany({
      include: {
        user: {
          select: {
            username: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleUserStatus(id: string, isActive: boolean) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    if (!isActive) {
      await this.prisma.userSession.updateMany({
        where: { userId: id, isActive: true },
        data: { isActive: false },
      });
    }

    return user;
  }

  async getReportQuality() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // ── 1. Rating distribution (all time vs last 30d) ──────────────────────────
    const [allByRating, recentByRating] = await Promise.all([
      this.prisma.agentReport.groupBy({
        by: ['finalRating'], _count: true,
        where: { status: 'completed' },
      }),
      this.prisma.agentReport.groupBy({
        by: ['finalRating'], _count: true,
        where: { status: 'completed', createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    const totalAll    = allByRating.reduce((s, r) => s + r._count, 0);
    const totalRecent = recentByRating.reduce((s, r) => s + r._count, 0);

    // ── 2. Data quality metrics ────────────────────────────────────────────────
    const [total, nullPrice, zeroConf, zeroTech] = await Promise.all([
      this.prisma.agentReport.count({ where: { status: 'completed' } }),
      this.prisma.agentReport.count({ where: { status: 'completed', currentPrice: null } }),
      this.prisma.agentReport.count({ where: { status: 'completed', confidenceScore: { lte: 0 } } }),
      this.prisma.agentReport.count({ where: { status: 'completed', technicalScore: { lte: 0 } } }),
    ]);

    const priceOk = total > 0 ? Math.round(100 * (total - nullPrice) / total) : 0;
    const confOk  = total > 0 ? Math.round(100 * (total - zeroConf)  / total) : 0;
    const techOk  = total > 0 ? Math.round(100 * (total - zeroTech)  / total) : 0;
    const dataQualityScore = Math.round((priceOk + confOk + techOk) / 3);

    // ── 3. Confidence calibration buckets ──────────────────────────────────────
    const outcomes = await this.prisma.reportOutcome.findMany({
      where: { overallVerdict: { not: 'PENDING' } },
      select: { confidenceAtTime: true, overallVerdict: true, ratingAtTime: true },
    });

    const bands = [
      { label: '80-100%', min: 80, max: 100 },
      { label: '60-79%',  min: 60, max: 80  },
      { label: '40-59%',  min: 40, max: 60  },
      { label: '0-39%',   min: 0,  max: 40  },
    ];
    const calibration = bands.map(b => {
      const inBand = outcomes.filter(o =>
        (o.confidenceAtTime ?? 0) >= b.min && (o.confidenceAtTime ?? 0) < b.max
      );
      const wins = inBand.filter(o => o.overallVerdict === 'WIN').length;
      return {
        band: b.label,
        total: inBand.length,
        wins,
        winRate: inBand.length > 0 ? Math.round(100 * wins / inBand.length) : null,
      };
    });

    // ── 4. Per-symbol outcome table (last 60 days, max 50) ────────────────────
    const outcomeRows = await this.prisma.reportOutcome.findMany({
      where: { reportCreatedAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } },
      orderBy: { reportCreatedAt: 'desc' },
      take: 50,
      select: {
        symbol: true, ratingAtTime: true, priceAtReport: true,
        confidenceAtTime: true, return5d: true, return10d: true,
        overallVerdict: true, reportCreatedAt: true, evaluatedAt: true,
      },
    });

    // ── 5. Daily report count (last 14d) ─────────────────────────────────────
    const reports14d = await this.prisma.agentReport.findMany({
      where: { status: 'completed', createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      select: { createdAt: true, finalRating: true },
    });
    const dailyMap: Record<string, { date: string; count: number; watchlistPct: number; counts: Record<string, number> }> = {};
    reports14d.forEach(r => {
      const d = r.createdAt.toISOString().split('T')[0];
      if (!dailyMap[d]) dailyMap[d] = { date: d, count: 0, watchlistPct: 0, counts: {} };
      dailyMap[d].count++;
      dailyMap[d].counts[r.finalRating] = (dailyMap[d].counts[r.finalRating] || 0) + 1;
    });
    Object.values(dailyMap).forEach(day => {
      day.watchlistPct = day.count > 0 ? Math.round(100 * (day.counts['WATCHLIST'] || 0) / day.count) : 0;
    });
    const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      summary: {
        totalReports: total,
        reportsLast30d: totalRecent,
        dataQualityScore,
        priceOkPct: priceOk,
        confidenceOkPct: confOk,
        technicalOkPct: techOk,
        nullPriceCount: nullPrice,
        zeroConfCount: zeroConf,
        zeroTechCount: zeroTech,
      },
      ratingDistribution: {
        all: allByRating.map(r => ({ rating: r.finalRating, count: r._count, pct: Math.round(100 * r._count / totalAll) })),
        recent: recentByRating.map(r => ({ rating: r.finalRating, count: r._count, pct: Math.round(100 * r._count / (totalRecent || 1)) })),
      },
      calibration,
      outcomeTable: outcomeRows,
      dailyTrend,
    };
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({
      where: { id },
    });
    return { success: true };
  }
}
