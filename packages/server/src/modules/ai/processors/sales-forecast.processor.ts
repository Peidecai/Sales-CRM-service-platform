import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SalesForecast, ForecastPeriodType } from '../entities/sales-forecast.entity'
import { AiFallbackService } from '../ai-fallback.service'

export interface SalesForecastJobData {
  periodType: ForecastPeriodType
}

@Processor('sales-forecast')
export class SalesForecastProcessor {
  private readonly logger = new Logger(SalesForecastProcessor.name)

  constructor(
    @InjectRepository(SalesForecast)
    private readonly forecastRepo: Repository<SalesForecast>,
    private readonly aiFallback: AiFallbackService,
  ) {}

  @Process()
  async handleForecast(job: Job<SalesForecastJobData>): Promise<void> {
    const { periodType } = job.data
    const now = new Date()
    const periodValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    this.logger.log(`Generating ${periodType} sales forecast`)

    try {
      const result = await this.aiFallback.invokeWithFallback(
        'sales_forecast',
        `请预测未来${periodType === '1month' ? '1个月' : periodType === '3month' ? '3个月' : '6个月'}的销售收入。返回JSON: { "forecastAmount": number, "confidenceLow": number, "confidenceHigh": number, "assumptions": {} }`,
      )

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(result.text)
      } catch {
        parsed = { forecastAmount: 0, confidenceLow: 0, confidenceHigh: 0, assumptions: {} }
      }

      // Upsert by periodType + periodValue
      const existing = await this.forecastRepo.findOne({ where: { periodType, periodValue } })
      if (existing) {
        existing.forecastAmount = (parsed.forecastAmount as number) ?? existing.forecastAmount
        existing.confidenceLow = (parsed.confidenceLow as number) ?? existing.confidenceLow
        existing.confidenceHigh = (parsed.confidenceHigh as number) ?? existing.confidenceHigh
        existing.assumptions =
          (parsed.assumptions as Record<string, unknown>) ?? existing.assumptions
        await this.forecastRepo.save(existing)
      } else {
        const forecast = this.forecastRepo.create({
          periodType,
          periodValue,
          forecastAmount: (parsed.forecastAmount as number) ?? 0,
          confidenceLow: (parsed.confidenceLow as number) ?? 0,
          confidenceHigh: (parsed.confidenceHigh as number) ?? 0,
          assumptions: (parsed.assumptions as Record<string, unknown>) ?? null,
        })
        await this.forecastRepo.save(forecast)
      }

      this.logger.log(`Sales forecast generated: ${periodType} for ${periodValue}`)
    } catch (error) {
      this.logger.error(`Failed to generate ${periodType} forecast`, String(error))
      throw error
    }
  }
}
