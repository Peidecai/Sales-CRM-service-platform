import { IsInt, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class GenerateContractDto {
  @ApiProperty({ description: '合同模板 ID' })
  @IsInt()
  @Type(() => Number)
  templateId!: number

  @ApiPropertyOptional({ description: '变量覆盖值' })
  @IsOptional()
  overrides?: Record<string, string>
}
