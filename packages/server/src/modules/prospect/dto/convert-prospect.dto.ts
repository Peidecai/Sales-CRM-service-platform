import { IsArray, ArrayMinSize, IsInt, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ConvertProspectDto {
  @ApiProperty({ description: '要转化的线索ID列表', type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  prospectIds!: number[]

  @ApiPropertyOptional({ description: '分配给的销售ID（可选，默认保持原分配）' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assignedUserId?: number
}
