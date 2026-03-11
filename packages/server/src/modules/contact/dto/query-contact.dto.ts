import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class QueryContactDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customerId?: number

  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20
}
