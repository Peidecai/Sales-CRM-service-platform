import { IsOptional, IsEnum, IsInt, IsPositive, Min } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { ApprovalStatus, ApprovalBizType } from '@crm/shared'

export class QueryApprovalDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number = 1

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20

  @ApiPropertyOptional({ enum: ApprovalStatus, description: '审批状态过滤' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus

  @ApiPropertyOptional({ enum: ApprovalBizType, description: '业务类型过滤' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(ApprovalBizType)
  bizType?: ApprovalBizType

  @ApiPropertyOptional({ description: '申请人 ID 过滤' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  applicantId?: number
}
