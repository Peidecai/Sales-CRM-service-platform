import { IsString, IsOptional, IsInt, IsPositive, Matches, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/** Matches Chinese mobile (1xx), landline (0xx-xxx), or international (+xxx) */
const PHONE_REGEX = /^(\+?\d{1,4}[-\s]?)?\d{7,15}$/

export class DialDto {
  @ApiProperty({ description: '被叫号码（手机/固话/国际号码）' })
  @IsString()
  @Matches(PHONE_REGEX, { message: '被叫号码格式不正确，支持手机号、固话或国际号码' })
  @MaxLength(20)
  calleeNumber!: string

  @ApiPropertyOptional({ description: '主叫号码（外显）' })
  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: '主叫号码格式不正确' })
  @MaxLength(20)
  callerNumber?: string

  @ApiPropertyOptional({ description: '关联客户ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  customerId?: number

  @ApiPropertyOptional({ description: '关联商机ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  opportunityId?: number
}
