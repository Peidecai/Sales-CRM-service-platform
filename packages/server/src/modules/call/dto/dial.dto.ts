import { IsString, IsOptional, IsInt, IsPositive, MinLength, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class DialDto {
  @ApiProperty({ description: '被叫号码' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  calleeNumber!: string

  @ApiPropertyOptional({ description: '主叫号码（外显）' })
  @IsOptional()
  @IsString()
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
