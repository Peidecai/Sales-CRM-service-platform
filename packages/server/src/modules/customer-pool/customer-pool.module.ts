import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Customer } from '../customer/customer.entity'
import { FollowUp } from '../follow-up/follow-up.entity'
import { CustomerPoolLog } from './entities/customer-pool-log.entity'
import { CustomerPoolController } from './customer-pool.controller'
import { CustomerPoolService } from './customer-pool.service'
import { CustomerPoolConfigService } from './customer-pool-config.service'
import { CustomerPoolScheduler } from './customer-pool.scheduler'

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerPoolLog, FollowUp])],
  controllers: [CustomerPoolController],
  providers: [CustomerPoolService, CustomerPoolConfigService, CustomerPoolScheduler],
  exports: [CustomerPoolService, CustomerPoolConfigService],
})
export class CustomerPoolModule {}
