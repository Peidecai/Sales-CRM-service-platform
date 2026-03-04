import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { CallRecord } from './call-record.entity'
import { CallRecordController } from './call-record.controller'
import { CallRecordService } from './call-record.service'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([CallRecord]),
    BullModule.registerQueue({ name: 'call-summary' }),
    AiModule,
  ],
  controllers: [CallRecordController],
  providers: [CallRecordService],
  exports: [CallRecordService],
})
export class CallRecordModule {}
