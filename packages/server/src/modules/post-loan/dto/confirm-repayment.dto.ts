import { IsNumber, Min, IsDateString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ConfirmRepaymentDto {
  @ApiProperty({ description: '实际还款金额' })
  @IsNumber()
  @Min(0)
  paidAmount!: number

  @ApiProperty({ description: '还款日期' })
  @IsDateString()
  paidAt!: string
}
