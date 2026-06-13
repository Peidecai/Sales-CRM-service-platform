import { PartialType } from '@nestjs/swagger'
import { CreateServiceRecordDto } from './create-service-record.dto'

export class UpdateServiceRecordDto extends PartialType(CreateServiceRecordDto) {}
