import { Injectable, Logger } from '@nestjs/common';
import { AlpacaService, AlpacaNewsItem } from '../services/alpaca.service';
import { PrismaService } from '../prisma/prisma.service';

export interface NewsResult {
  available: boolean;
  source: string;
  items: NewsArticle[];
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | null;
  unavailableReason?: string;
}

export interface NewsArticle {
  headline: string;
  summary: string | null;
  source: string | null;
  url: string | null;
  publishedAt: string | null;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | null;
}

// Simple keyword-based sentiment (no paid API)
function analyzeSentiment(text: string): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
  const positive = ['beat', 'surge', 'rally', 'gain', 'record', 'growth', 'profit', 'upgrade', 'buy', 'bullish', 'rises', 'up', 'positive', 'strong', 'outperform'];
  const negative = ['miss', 'fall', 'drop', 'loss', 'cut', 'downgrade', 'sell', 'bearish', 'decline', 'down', 'negative', 'weak', 'concern', 'risk', 'warning'];

  const lower = text.toLowerCase();
  const posScore = positive.filter((w) => lower.includes(w)).length;
  const negScore = negative.filter((w) => lower.includes(w)).length;

  if (posScore > negScore) return 'POSITIVE';
  if (negScore > posScore) return 'NEGATIVE';
  return 'NEUTRAL';
}

@Injectable()
export class NewsAgent {
  private readonly logger = new Logger(NewsAgent.name);

  constructor(
    private readonly alpaca: AlpacaService,
    private readonly prisma: PrismaService,
  ) {}

  async run(symbol: string): Promise<NewsResult> {
    this.logger.log(`Fetching news for ${symbol}`);

    try {
      const rawNews = await this.alpaca.getNews(symbol, 10);

      if (!rawNews || rawNews.length === 0) {
        return {
          available: false,
          source: 'alpaca_news',
          items: [],
          sentiment: null,
          unavailableReason: 'No recent news available for this symbol.',
        };
      }

      const items: NewsArticle[] = rawNews.map((n: AlpacaNewsItem) => {
        const text = `${n.headline} ${n.summary || ''}`;
        const sentiment = analyzeSentiment(text);
        return {
          headline: n.headline,
          summary: n.summary || null,
          source: n.source || null,
          url: n.url || null,
          publishedAt: n.created_at || null,
          sentiment,
        };
      });

      // Overall sentiment
      const sentimentCounts = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0 };
      items.forEach((i) => sentimentCounts[i.sentiment]++);
      const overallSentiment =
        sentimentCounts.POSITIVE > sentimentCounts.NEGATIVE
          ? 'POSITIVE'
          : sentimentCounts.NEGATIVE > sentimentCounts.POSITIVE
          ? 'NEGATIVE'
          : 'NEUTRAL';

      // Persist
      try {
        await Promise.allSettled(
          items.map((item) =>
            this.prisma.newsEvent.create({
              data: {
                symbol,
                headline: item.headline,
                summary: item.summary,
                source: item.source,
                url: item.url,
                sentiment: item.sentiment,
                publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
              },
            }),
          ),
        );
      } catch (e) {
        this.logger.warn(`News persist failed: ${e.message}`);
      }

      return {
        available: true,
        source: 'alpaca_news',
        items,
        sentiment: overallSentiment,
      };
    } catch (error) {
      this.logger.warn(`News fetch failed for ${symbol}: ${error.message}`);
      return {
        available: false,
        source: 'unavailable',
        items: [],
        sentiment: null,
        unavailableReason: 'News data temporarily unavailable.',
      };
    }
  }
}
