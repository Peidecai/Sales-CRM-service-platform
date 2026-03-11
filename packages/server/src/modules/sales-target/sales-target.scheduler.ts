import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { SalesTargetService } from './sales-target.service'

@Injectable()
export class SalesTargetScheduler {
  private readonly logger = new Logger(SalesTargetScheduler.name)

  constructor(private readonly salesTargetService: SalesTargetService) {}

  /**
   * 每小时更新所有活跃目标的达成值
   * Runs at minute 15 of every hour to avoid peak load
   */
  @Cron('0 15 * * * *')
  async handleAchievementUpdate(): Promise<void> {
    this.logger.log('Starting achievement auto-update...')
    try {
      const updated = await this.salesTargetService.updateAllAchievements()
      this.logger.log(`Achievement update completed: ${updated} targets updated`)
    } catch (error) {
      this.logger.error(
        'Achievement update failed',
        error instanceof Error ? error.stack : String(error),
      )
    }
  }

  /**
   * 每日凌晨 2:30 生成业绩排行快照
   */
  @Cron('0 30 2 * * *')
  async handleRankingSnapshot(): Promise<void> {
    this.logger.log('Starting ranking snapshot...')
    try {
      const created = await this.salesTargetService.snapshotRankings()
      this.logger.log(`Ranking snapshot completed: ${created} records created`)
    } catch (error) {
      this.logger.error(
        'Ranking snapshot failed',
        error instanceof Error ? error.stack : String(error),
      )
    }
  }
}
