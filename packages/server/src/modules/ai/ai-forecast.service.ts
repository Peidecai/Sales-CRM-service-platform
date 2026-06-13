import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Repository } from 'typeorm'
import { Queue } from 'bull'
import { SalesForecast, ForecastPeriodType } from './entities/sales-forecast.entity'

@Injectable()
export class AiForecastService {
  constructor(
    @InjectRepository(SalesForecast)
    private readonly forecastRepo: Repository<SalesForecast>,
    @InjectQueue('sales-forecast')
    private readonly forecastQueue: Queue,
  ) {}

  async getSalesForecasts(periodType?: ForecastPeriodType) {
    const where: Record<string, unknown> = {}
    if (periodType) where['periodType'] = periodType

    const list = await this.forecastRepo.find({
      where,
      order: { updatedAt: 'DESC' },
      take: 10,
    })

    return list
  }

  async generateSalesForecast(periodType: ForecastPeriodType) {
    await this.forecastQueue.add({ periodType })
    return { status: 'queued' }
  }
}
