import { IsOptional, IsEnum, IsNumberString } from 'class-validator'
import { PkStatus } from '@crm/shared'

export class QueryPkDto {
  @IsOptional()
  @IsEnum(PkStatus)
  status?: PkStatus

  @IsOptional()
  @IsNumberString()
  page?: string

  @IsOptional()
  @IsNumberString()
  pageSize?: string
}
