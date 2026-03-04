import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CallRecord } from './call-record.entity'
import { CallRecordController } from './call-record.controller'
import { CallRecordService } from './call-record.service'

@Module({
  imports: [TypeOrmModule.forFeature([CallRecord])],
  controllers: [CallRecordController],
  providers: [CallRecordService],
  exports: [CallRecordService],
})
export class CallRecordModule {}
