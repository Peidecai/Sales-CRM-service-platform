import { IsEnum, IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { FollowUpType } from '../follow-up.entity'

export class QueryFollowUpDto {
  @ApiPropertyOptional({ description: '客户 ID（可选，传则查该客户跟进，不传则查全部）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  customerId?: number

  @ApiPropertyOptional({ description: '销售员 ID（SALES 角色自动填入当前用户）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  userId?: number

  @ApiPropertyOptional({ enum: FollowUpType, description: '跟进方式过滤' })
  @IsOptional()
  @IsEnum(FollowUpType)
  type?: FollowUpType

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20
}
