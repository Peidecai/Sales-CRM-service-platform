import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FollowUp } from './follow-up.entity'
import { FollowUpController } from './follow-up.controller'
import { FollowUpService } from './follow-up.service'
import { FollowUpScheduler } from './follow-up.scheduler'
import { CustomerModule } from '../customer/customer.module'

@Module({
  imports: [TypeOrmModule.forFeature([FollowUp]), CustomerModule],
  controllers: [FollowUpController],
  providers: [FollowUpService, FollowUpScheduler],
  exports: [FollowUpService, TypeOrmModule],
})
export class FollowUpModule {}
