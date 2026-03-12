import { IsEnum, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ApprovalAction } from '@crm/shared'

export class AttachmentItemDto {
  @ApiProperty({ description: '附件名称' })
  @IsString()
  name!: string

  @ApiProperty({ description: '附件 URL' })
  @IsString()
  url!: string
}

export class ApproveActionDto {
  @ApiProperty({
    enum: ApprovalAction,
    description: '审批动作：approve=通过，reject=驳回，delegate=转交',
  })
  @IsEnum(ApprovalAction)
  action!: ApprovalAction

  @ApiPropertyOptional({ description: '审批意见' })
  @IsOptional()
  @IsString()
  opinion?: string

  @ApiPropertyOptional({ type: [AttachmentItemDto], description: '附件列表' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentItemDto)
  attachments?: AttachmentItemDto[]
}
