import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThanOrEqual } from 'typeorm'
import { PkStatus } from '@crm/shared'
import { Pk } from './pk.entity'
import { PkService } from './pk.service'

@Injectable()
export class PkCronService {
  private readonly logger = new Logger(PkCronService.name)

  constructor(
    @InjectRepository(Pk) private readonly pkRepo: Repository<Pk>,
    private readonly pkService: PkService,
  ) {}

  /** Refresh scores for active PKs every 5 minutes */
  @Cron('*/5 * * * *')
  async refreshActiveScores(): Promise<void> {
    const activePks = await this.pkRepo.find({ where: { status: PkStatus.ACTIVE } })
    for (const pk of activePks) {
      try {
        await this.pkService.calculateScore(pk.id)
      } catch (err) {
        this.logger.warn(`Failed to refresh score for PK ${pk.id}: ${(err as Error).message}`)
      }
    }
  }

  /** Auto-settle ended PKs every minute */
  @Cron('* * * * *')
  async autoSettle(): Promise<void> {
    const now = new Date()
    const endedPks = await this.pkRepo.find({
      where: { status: PkStatus.ACTIVE, endDate: LessThanOrEqual(now) },
    })
    for (const pk of endedPks) {
      try {
        await this.pkService.settle(pk.id)
      } catch (err) {
        this.logger.warn(`Failed to auto-settle PK ${pk.id}: ${(err as Error).message}`)
      }
    }
  }
}
