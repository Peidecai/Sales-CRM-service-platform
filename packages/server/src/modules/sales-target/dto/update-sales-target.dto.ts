import { PartialType } from '@nestjs/swagger'
import { CreateSalesTargetDto } from './create-sales-target.dto'

export class UpdateSalesTargetDto extends PartialType(CreateSalesTargetDto) {}
