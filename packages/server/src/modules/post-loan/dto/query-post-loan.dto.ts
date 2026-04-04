import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { PostLoanStatus } from '@crm/shared'

export class QueryPostLoanDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20

  @ApiPropertyOptional({ enum: PostLoanStatus })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(PostLoanStatus)
  status?: PostLoanStatus
}
