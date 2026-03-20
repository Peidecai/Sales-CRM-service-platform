import { IsInt, IsPositive, IsNumber, IsDateString, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreatePostLoanDto {
  @ApiProperty({ description: '合同ID' })
  @IsInt()
  @IsPositive()
  contractId!: number

  @ApiProperty({ description: '贷款金额' })
  @IsNumber()
  @Min(0)
  loanAmount!: number

  @ApiProperty({ description: '还款期数' })
  @IsInt()
  @Min(1)
  repaymentCount!: number

  @ApiProperty({ description: '放款日期' })
  @IsDateString()
  disbursedAt!: string
}
