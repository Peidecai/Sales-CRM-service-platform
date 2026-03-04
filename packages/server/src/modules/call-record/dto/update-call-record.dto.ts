import { PartialType } from '@nestjs/swagger'
import { CreateCallRecordDto } from './create-call-record.dto'

export class UpdateCallRecordDto extends PartialType(CreateCallRecordDto) {}
