import { IsInt, IsNumber, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateSigningProcessDto {
  @ApiProperty({ description: '商机 ID' })
  @IsInt()
  @Type(() => Number)
  opportunityId!: number

  @ApiProperty({ description: '签约金额' })
  @IsNumber()
  @Type(() => Number)
  amount!: number

  @ApiPropertyOptional({ description: '合同模板 ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  templateId?: number
}
