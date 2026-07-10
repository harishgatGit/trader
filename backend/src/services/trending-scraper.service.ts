import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { isFundSymbol } from '../modules/analysis/analysis.service';

@Injectable()
export class TrendingScraperService {
  private readonly logger = new Logger(TrendingScraperService.name);

  // Fallback trending tickers, grouped by sector so selection can be diversified
  // rather than always taking the first N (which used to cluster on mega-cap tech).
  private readonly sectorPools: Record<string, string[]> = {
    MEGA_CAP_TECH: ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'AMD', 'ORCL'],
    GROWTH_AI: ['PLTR', 'ARM', 'SMCI', 'CRWD', 'NET', 'SNOW', 'DDOG', 'MDB', 'HUBS', 'SHOP'],
    CRYPTO: ['COIN', 'MSTR', 'MARA', 'RIOT', 'CLSK', 'HUT', 'BTBT', 'CIFR'],
    FINANCE: ['JPM', 'GS', 'MS', 'BAC', 'V', 'MA', 'PYPL', 'SQ', 'HOOD', 'SOFI'],
    EV_AUTO: ['RIVN', 'LCID', 'NIO', 'LI', 'XPEV', 'GM', 'F'],
    BIOTECH_PHARMA: ['LLY', 'NVO', 'MRNA', 'BNTX', 'REGN', 'AMGN', 'GILD', 'BIIB'],
    ENERGY: ['XOM', 'CVX', 'OXY', 'DVN', 'MPC', 'PSX'],
    CONSUMER_RETAIL: ['NFLX', 'DIS', 'COST', 'WMT', 'TGT', 'BABA', 'JD'],
    SEMIS: ['INTC', 'QCOM', 'MU', 'TXN', 'AMAT', 'LRCX', 'KLAC', 'ASML'],
    // No index/ETF pool: fund symbols route through a separate fund-analysis
    // path that never fires a video job, so including them here just burns
    // a slot in the top-5 pick without producing any output.
  };

  // Flat ticker -> sector lookup, used to diversify scraped results too.
  private readonly tickerSector: Map<string, string> = new Map(
    Object.entries(this.sectorPools).flatMap(([sector, tickers]) =>
      tickers.map((t) => [t, sector] as [string, string]),
    ),
  );

  private shuffle<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /**
   * Round-robins across sectors (in randomized order, with each sector's
   * tickers shuffled) so the returned list isn't dominated by whichever
   * sector happened to appear first in the source data.
   */
  private diversify(tickers: string[], limit: number): string[] {
    const groups = new Map<string, string[]>();
    for (const ticker of tickers) {
      const sector = this.tickerSector.get(ticker) ?? 'OTHER';
      if (!groups.has(sector)) groups.set(sector, []);
      groups.get(sector)!.push(ticker);
    }

    const shuffledGroups = this.shuffle([...groups.entries()]).map(
      ([sector, list]) => [sector, this.shuffle(list)] as [string, string[]],
    );

    const result: string[] = [];
    let addedAny = true;
    while (result.length < limit && addedAny) {
      addedAny = false;
      for (const [, list] of shuffledGroups) {
        if (list.length === 0) continue;
        result.push(list.shift()!);
        addedAny = true;
        if (result.length >= limit) break;
      }
    }
    return result;
  }

  async fetchTrendingTickers(limit: number = 20): Promise<string[]> {
    this.logger.log(`Fetching top ${limit} trending tickers...`);
    try {
      const response = await axios.get('https://finance.yahoo.com/trending-tickers', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 12000,
        maxContentLength: 5 * 1024 * 1024, // 5MB
        decompress: true,
      });

      const $ = cheerio.load(response.data);
      const scrapedTickers: string[] = [];

      // Find links pointing to /quote/SYMBOL
      $('a').each((_, elem) => {
        const href = $(elem).attr('href') || '';
        const match = href.match(/\/quote\/([A-Z0-9.-]+)/i);
        if (match) {
          const ticker = match[1].toUpperCase();
          if (ticker && !scrapedTickers.includes(ticker)) {
            const cleanTicker = ticker.split('?')[0].trim();
            if (cleanTicker.match(/^[A-Z0-9.-]+$/) && !isFundSymbol(cleanTicker)) {
              scrapedTickers.push(cleanTicker);
            }
          }
        }
      });

      if (scrapedTickers.length >= 5) {
        this.logger.log(`Successfully scraped ${scrapedTickers.length} tickers from Yahoo Finance.`);
        return this.diversify(scrapedTickers, limit);
      }

      this.logger.warn(`Scraped only ${scrapedTickers.length} tickers. Using fallback list.`);
    } catch (error: any) {
      this.logger.error(`Error scraping Yahoo Finance trending tickers: ${error.message}. Using fallback.`);
    }

    const allFallback = Object.values(this.sectorPools).flat().filter((t) => !isFundSymbol(t));
    return this.diversify(allFallback, limit);
  }
}
