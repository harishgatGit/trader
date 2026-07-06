import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { isFundSymbol } from '../modules/analysis/analysis.service';

@Injectable()
export class TrendingScraperService {
  private readonly logger = new Logger(TrendingScraperService.name);

  // Fallback top trending tickers — large enough to survive exclusions
  private readonly fallbackTrending = [
    // Mega-cap tech
    'AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'AMD', 'ORCL',
    // Growth / AI
    'PLTR', 'ARM', 'SMCI', 'CRWD', 'NET', 'SNOW', 'DDOG', 'MDB', 'HUBS', 'SHOP',
    // Crypto-adjacent
    'COIN', 'MSTR', 'MARA', 'RIOT', 'CLSK', 'HUT', 'BTBT', 'CIFR',
    // Finance
    'JPM', 'GS', 'MS', 'BAC', 'V', 'MA', 'PYPL', 'SQ', 'HOOD', 'SOFI',
    // EV / Autos
    'TSLA', 'RIVN', 'LCID', 'NIO', 'LI', 'XPEV', 'GM', 'F',
    // Biotech / Pharma
    'LLY', 'NVO', 'MRNA', 'BNTX', 'REGN', 'AMGN', 'GILD', 'BIIB',
    // Energy
    'XOM', 'CVX', 'OXY', 'DVN', 'MPC', 'PSX',
    // Consumer / Retail
    'NFLX', 'DIS', 'AMZN', 'COST', 'WMT', 'TGT', 'BABA', 'JD',
    // Semis
    'INTC', 'QCOM', 'MU', 'TXN', 'AMAT', 'LRCX', 'KLAC', 'ASML',
    // Other popular
    'SPY', 'QQQ', 'IWM', 'GLD', 'SLV', 'USO', 'XLF', 'XLE', 'ARKK',
  ];

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
        return scrapedTickers.slice(0, limit);
      }

      this.logger.warn(`Scraped only ${scrapedTickers.length} tickers. Using fallback list.`);
    } catch (error: any) {
      this.logger.error(`Error scraping Yahoo Finance trending tickers: ${error.message}. Using fallback.`);
    }

    return this.fallbackTrending.slice(0, limit);
  }
}
