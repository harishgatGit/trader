import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

export interface FundamentalResult {
  available: boolean;
  source: string;
  marketCap: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  epsTrailing: number | null;
  epsForward: number | null;
  revenue: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  beta: number | null;
  week52High: number | null;
  week52Low: number | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  unavailableReason?: string;
}

@Injectable()
export class FundamentalAgent {
  private readonly logger = new Logger(FundamentalAgent.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(symbol: string): Promise<FundamentalResult> {
    this.logger.log(`Fetching fundamentals for ${symbol}`);

    // Try Yahoo Finance (unofficial but free)
    try {
      const result = await this.fetchYahooFinance(symbol);
      if (result.available) {
        await this.persist(symbol, result);
        return result;
      }
    } catch (e) {
      this.logger.warn(`Yahoo Finance failed for ${symbol}: ${e.message}`);
    }

    // Check DB for recent data (within 24h)
    try {
      const recent = await this.prisma.fundamentalSnapshot.findFirst({
        where: {
          symbol,
          available: true,
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (recent && recent.available) {
        return {
          available: true,
          source: 'cache',
          marketCap: recent.marketCap,
          peRatio: recent.peRatio,
          pbRatio: recent.pbRatio,
          epsTrailing: recent.epsTrailing,
          epsForward: recent.epsForward,
          revenue: recent.revenue,
          debtToEquity: recent.debtToEquity,
          dividendYield: recent.dividendYield,
          beta: recent.beta,
          week52High: recent.week52High,
          week52Low: recent.week52Low,
          sector: recent.sector,
          industry: recent.industry,
          description: recent.description,
        };
      }
    } catch (e) {
      this.logger.warn(`Cache lookup failed: ${e.message}`);
    }

    return {
      available: false,
      source: 'unavailable',
      marketCap: null, peRatio: null, pbRatio: null,
      epsTrailing: null, epsForward: null, revenue: null,
      debtToEquity: null, dividendYield: null, beta: null,
      week52High: null, week52Low: null, sector: null,
      industry: null, description: null,
      unavailableReason: 'Fundamental data not available from free sources for this symbol.',
    };
  }

  private async getYahooCredentials(): Promise<{ cookie: string; crumb: string } | null> {
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      
      const fcRes = await axios.get('https://fc.yahoo.com', { headers, timeout: 5000 }).catch(e => e.response);
      const cookies = fcRes?.headers?.['set-cookie'] || [];
      const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
      
      if (!cookieHeader) return null;

      const crumbRes = await axios.get('https://query1.finance.yahoo.com/v1/test/getcrumb', {
        headers: { ...headers, Cookie: cookieHeader },
        timeout: 5000,
      });
      const crumb = crumbRes.data;

      if (!crumb) return null;

      return { cookie: cookieHeader, crumb };
    } catch (e) {
      this.logger.warn(`Failed to get Yahoo credentials: ${e.message}`);
      return null;
    }
  }

  private async fetchYahooFinance(symbol: string): Promise<FundamentalResult> {
    const creds = await this.getYahooCredentials();
    if (!creds) {
      throw new Error('Yahoo credentials handshake failed');
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Cookie': creds.cookie,
    };

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const response = await axios.get(url, {
      params: { interval: '1d', range: '1d', crumb: creds.crumb },
      timeout: 8000,
      headers,
    });

    const meta = response.data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('No meta data from Yahoo');

    const quoteUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`;
    const summaryRes = await axios.get(quoteUrl, {
      params: {
        crumb: creds.crumb,
        modules: 'summaryDetail,defaultKeyStatistics,assetProfile,financialData',
      },
      timeout: 8000,
      headers,
    });

    const summary = summaryRes.data?.quoteSummary?.result?.[0];
    const sd = summary?.summaryDetail || {};
    const ks = summary?.defaultKeyStatistics || {};
    const ap = summary?.assetProfile || {};
    const fd = summary?.financialData || {};

    return {
      available: true,
      source: 'yahoo_finance',
      marketCap: sd.marketCap?.raw || null,
      peRatio: sd.trailingPE?.raw || null,
      pbRatio: ks.priceToBook?.raw || null,
      epsTrailing: ks.trailingEps?.raw || null,
      epsForward: ks.forwardEps?.raw || null,
      revenue: fd.totalRevenue?.raw || null,
      debtToEquity: fd.debtToEquity?.raw || null,
      dividendYield: sd.dividendYield?.raw || null,
      beta: sd.beta?.raw || null,
      week52High: sd.fiftyTwoWeekHigh?.raw || null,
      week52Low: sd.fiftyTwoWeekLow?.raw || null,
      sector: ap.sector || null,
      industry: ap.industry || null,
      description: ap.longBusinessSummary?.substring(0, 500) || null,
    };
  }

  private async persist(symbol: string, data: FundamentalResult) {
    try {
      await this.prisma.fundamentalSnapshot.create({
        data: {
          symbol,
          source: data.source,
          available: data.available,
          marketCap: data.marketCap,
          peRatio: data.peRatio,
          pbRatio: data.pbRatio,
          epsTrailing: data.epsTrailing,
          epsForward: data.epsForward,
          revenue: data.revenue,
          debtToEquity: data.debtToEquity,
          dividendYield: data.dividendYield,
          beta: data.beta,
          week52High: data.week52High,
          week52Low: data.week52Low,
          sector: data.sector,
          industry: data.industry,
          description: data.description,
        },
      });
    } catch (e) {
      this.logger.warn(`Fundamental persist failed: ${e.message}`);
    }
  }
}
