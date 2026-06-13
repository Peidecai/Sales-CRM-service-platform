import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AiConfig } from './ai-config.entity'
import { AiPromptTemplate } from './ai-prompt-template.entity'
import { AiPromptHistory } from './ai-prompt-history.entity'
import { AiUsageLog } from './ai-usage-log.entity'
import { AiConfigService } from './ai-config.service'
import { AiPromptService } from './ai-prompt.service'
import { AiUsageService } from './ai-usage.service'
import { AiPlaygroundService } from './ai-playground.service'
import { AiConfigController } from './ai-config.controller'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([AiConfig, AiPromptTemplate, AiPromptHistory, AiUsageLog]),
    AiModule,
  ],
  controllers: [AiConfigController],
  providers: [AiConfigService, AiPromptService, AiUsageService, AiPlaygroundService],
  exports: [AiConfigService, AiUsageService],
})
export class AiConfigModule {}
