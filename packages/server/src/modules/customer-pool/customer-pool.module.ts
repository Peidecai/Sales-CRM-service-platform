import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CustomerPoolLog } from './entities/customer-pool-log.entity'
import { CustomerPoolController } from './customer-pool.controller'
import { CustomerPoolService } from './customer-pool.service'
import { CustomerPoolConfigService } from './customer-pool-config.service'
import { CustomerPoolScheduler } from './customer-pool.scheduler'
import { CustomerModule } from '../customer/customer.module'
import { FollowUpModule } from '../follow-up/follow-up.module'

@Module({
  imports: [TypeOrmModule.forFeature([CustomerPoolLog]), CustomerModule, FollowUpModule],
  controllers: [CustomerPoolController],
  providers: [CustomerPoolService, CustomerPoolConfigService, CustomerPoolScheduler],
  exports: [CustomerPoolService, CustomerPoolConfigService],
})
export class CustomerPoolModule {}
