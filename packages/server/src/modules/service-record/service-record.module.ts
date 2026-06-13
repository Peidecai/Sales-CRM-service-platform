import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ServiceRecord } from './entities/service-record.entity'
import { ServiceRecordController } from './service-record.controller'
import { ServiceRecordService } from './service-record.service'
import { CustomerModule } from '../customer/customer.module'

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRecord]), CustomerModule],
  controllers: [ServiceRecordController],
  providers: [ServiceRecordService],
  exports: [ServiceRecordService, TypeOrmModule],
})
export class ServiceRecordModule {}
