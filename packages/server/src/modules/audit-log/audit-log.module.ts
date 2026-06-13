import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditLog } from './audit-log.entity'
import { AuditLogService } from './audit-log.service'
import { AuditLogArchiveService } from './audit-log-archive.service'
import { AuditLogController } from './audit-log.controller'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditLogArchiveService],
  exports: [AuditLogService, AuditLogArchiveService],
})
export class AuditLogModule {}
