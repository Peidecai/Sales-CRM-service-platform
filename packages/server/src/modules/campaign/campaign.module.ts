import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CampaignTask } from './entities/campaign-task.entity'
import { CampaignCallItem } from './entities/campaign-call-item.entity'
import { CampaignService } from './campaign.service'
import { CampaignController } from './campaign.controller'

@Module({
  imports: [TypeOrmModule.forFeature([CampaignTask, CampaignCallItem])],
  controllers: [CampaignController],
  providers: [CampaignService],
  exports: [CampaignService],
})
export class CampaignModule {}
