import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WhatsForTodayService } from './whats-for-today.service';

@Injectable()
export class WhatsForTodayScheduler {
  private readonly logger = new Logger(WhatsForTodayScheduler.name);

  constructor(private readonly service: WhatsForTodayService) {}

  // 1. Pre-Market: 8:00 AM CST (9:00 AM EST), Mon-Fri
  @Cron('0 9 * * 1-5', { timeZone: 'America/New_York' })
  async handlePreMarket() {
    this.logger.log('Cron: Triggering Pre-Market report (Run 1) @ 8:00 AM CST...');
    try {
      await this.service.generateDailyReport(1);
      this.logger.log('Cron: Pre-Market report generated successfully.');
    } catch (err: any) {
      this.logger.error(`Cron: Pre-Market report generation failed: ${err.message}`);
    }
  }

  // 2. After Market Open: fires at 9:50 AM CST (10:50 AM EST) so report is
  //    ready before the 10:00 AM CST tab unlocks on the frontend.
  @Cron('50 10 * * 1-5', { timeZone: 'America/New_York' })
  async handleMarketOpen() {
    this.logger.log('Cron: Triggering Market Open report (Run 2) @ 9:50 AM CST...');
    try {
      await this.service.generateDailyReport(2);
      this.logger.log('Cron: Market Open report generated successfully.');
    } catch (err: any) {
      this.logger.error(`Cron: Market Open report generation failed: ${err.message}`);
    }
  }

  // 3. Mid-Market: fires at 12:50 PM CST (1:50 PM EST) — ready before 1:00 PM CST tab unlock.
  @Cron('50 13 * * 1-5', { timeZone: 'America/New_York' })
  async handleMidMarket() {
    this.logger.log('Cron: Triggering Mid-Market report (Run 3) @ 12:50 PM CST...');
    try {
      await this.service.generateDailyReport(3);
      this.logger.log('Cron: Mid-Market report generated successfully.');
    } catch (err: any) {
      this.logger.error(`Cron: Mid-Market report generation failed: ${err.message}`);
    }
  }

  // 4. Market Close / EOD: fires at 4:20 PM CST (5:20 PM EST) — ready before 4:30 PM CST tab unlock.
  @Cron('20 17 * * 1-5', { timeZone: 'America/New_York' })
  async handleMarketClose() {
    this.logger.log('Cron: Triggering Market Close report (Run 4) @ 4:20 PM CST...');
    try {
      await this.service.generateDailyReport(4);
      this.logger.log('Cron: Market Close report generated successfully.');
    } catch (err: any) {
      this.logger.error(`Cron: Market Close report generation failed: ${err.message}`);
    }
  }

  // 5. Penny Stock Watchlist Daily Scan: 5:00 PM EST, Mon-Fri
  @Cron('0 17 * * 1-5', { timeZone: 'America/New_York' })
  async handlePennyStockScan() {
    this.logger.log('Cron: Triggering Penny Stock Watchlist Scan...');
    try {
      await this.service.scanPennyStocks(true);
      this.logger.log('Cron: Penny Stock Watchlist Scan completed successfully.');
    } catch (err: any) {
      this.logger.error(`Cron: Penny Stock Watchlist Scan failed: ${err.message}`);
    }
  }
}
