import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateUnicomPhoneBindingDto {
  @ApiProperty({ description: '联通云呼绑定手机号', example: '13800138000' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确，应为11位中国大陆手机号' })
  phone!: string

  @ApiProperty({ description: '绑定销售员用户 ID', example: 7 })
  @Type(() => Number)
  @IsInt()
  userId!: number

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string | null
}

export class UpdateUnicomPhoneBindingDto extends PartialType(CreateUnicomPhoneBindingDto) {}

export interface UnicomPhoneBindingVo {
  id: number
  phone: string
  userId: number
  userName: string | null
  username: string | null
  userPhone: string | null
  isEnabled: boolean
  remark: string | null
  recordCallbackUrl: string
  transcriptionCallbackUrl: string
  createdAt: Date
  updatedAt: Date
}
