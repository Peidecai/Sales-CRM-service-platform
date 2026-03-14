import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { CallRecord } from './call-record.entity'
import { CallRecordController } from './call-record.controller'
import { CallRecordService } from './call-record.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([CallRecord]),
    // Register call-summary queue directly — no need to import all of AiModule for queue access
    BullModule.registerQueue({
      name: 'call-summary',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
  ],
  controllers: [CallRecordController],
  providers: [CallRecordService],
  exports: [CallRecordService, TypeOrmModule],
})
export class CallRecordModule {}
