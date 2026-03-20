import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { HealthController, AppErrorReportController } from './health.controller'
import { SystemHealthCheckScheduler } from './system-health-check.scheduler'

@Module({
  imports: [TerminusModule],
  controllers: [HealthController, AppErrorReportController],
  providers: [SystemHealthCheckScheduler],
})
export class HealthModule {}
