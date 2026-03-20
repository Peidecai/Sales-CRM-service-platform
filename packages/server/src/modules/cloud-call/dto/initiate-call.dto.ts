import { IsNotEmpty, IsString, IsInt, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class InitiateCallDto {
  @ApiProperty({ description: '客户ID' })
  @IsInt()
  @IsNotEmpty()
  customerId!: number

  @ApiProperty({ description: '销售手机号', example: '13800138000' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  callerPhone!: string

  @ApiProperty({ description: '客户电话', example: '13900139000' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '电话号码格式不正确' })
  calleePhone!: string
}
