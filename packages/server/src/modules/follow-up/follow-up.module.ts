import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FollowUp } from './follow-up.entity'
import { ReminderSetting } from './entities/reminder-setting.entity'
import { FollowUpController } from './follow-up.controller'
import { FollowUpService } from './follow-up.service'
import { FollowUpScheduler } from './follow-up.scheduler'
import { FollowUpAiReminderService } from './follow-up-ai-reminder.service'
import { CustomerModule } from '../customer/customer.module'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [TypeOrmModule.forFeature([FollowUp, ReminderSetting]), CustomerModule, AiModule],
  controllers: [FollowUpController],
  providers: [FollowUpService, FollowUpScheduler, FollowUpAiReminderService],
  exports: [FollowUpService, FollowUpAiReminderService, TypeOrmModule],
})
export class FollowUpModule {}
