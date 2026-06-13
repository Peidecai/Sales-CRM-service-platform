import { IsString, IsEnum, IsInt, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ApprovalBizType } from '@crm/shared'

export class CreateApprovalInstanceDto {
  @ApiProperty({ enum: ApprovalBizType, description: '业务类型' })
  @IsEnum(ApprovalBizType)
  bizType!: ApprovalBizType

  @ApiProperty({ description: '业务记录 ID（如报价单/合同 ID）' })
  @IsInt()
  bizId!: number

  @ApiPropertyOptional({ description: '业务单号（可读编号，如 QT-2024-001）', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bizNo?: string

  @ApiProperty({ description: '审批标题', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string
}
