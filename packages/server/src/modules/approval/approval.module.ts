import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApprovalFlow } from './entities/approval-flow.entity'
import { ApprovalInstance } from './entities/approval-instance.entity'
import { ApprovalRecord } from './entities/approval-record.entity'
import { ApprovalService } from './approval.service'
import { ApprovalController } from './approval.controller'

@Module({
  imports: [TypeOrmModule.forFeature([ApprovalFlow, ApprovalInstance, ApprovalRecord])],
  controllers: [ApprovalController],
  providers: [ApprovalService],
  exports: [ApprovalService],
})
export class ApprovalModule {}
