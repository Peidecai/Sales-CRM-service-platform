import { IsOptional, IsInt, IsDateString, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class ExamStatisticsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  paperId?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number
}
