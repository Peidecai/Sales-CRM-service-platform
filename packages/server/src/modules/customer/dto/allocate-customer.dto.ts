import { IsInt, IsPositive } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AllocateCustomerDto {
  @ApiProperty({ description: '目标销售员用户 ID', example: 2 })
  @IsInt()
  @IsPositive()
  assignedUserId!: number
}
