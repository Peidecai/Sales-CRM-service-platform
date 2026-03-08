import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FollowUp } from './follow-up.entity'
import { Customer } from '../customer/customer.entity'
import { FollowUpController } from './follow-up.controller'
import { FollowUpService } from './follow-up.service'

@Module({
  imports: [TypeOrmModule.forFeature([FollowUp, Customer])],
  controllers: [FollowUpController],
  providers: [FollowUpService],
  exports: [FollowUpService],
})
export class FollowUpModule {}
