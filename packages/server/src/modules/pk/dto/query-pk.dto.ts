import { IsOptional, IsEnum, IsNumberString } from 'class-validator'
import { Transform } from 'class-transformer'
import { PkStatus } from '@crm/shared'

export class QueryPkDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(PkStatus)
  status?: PkStatus

  @IsOptional()
  @IsNumberString()
  page?: string

  @IsOptional()
  @IsNumberString()
  pageSize?: string
}
