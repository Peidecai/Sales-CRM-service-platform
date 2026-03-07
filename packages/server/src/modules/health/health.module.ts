import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { HealthController } from './health.controller'
import { SystemHealthCheckScheduler } from './system-health-check.scheduler'

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [SystemHealthCheckScheduler],
})
export class HealthModule {}
