import { IsArray, ArrayMinSize, IsInt, IsIn, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class BatchOperationDto {
  @ApiProperty({ description: '线索ID列表', type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  ids!: number[]

  @ApiProperty({ description: '操作类型', enum: ['assign', 'reject', 'delete'] })
  @IsIn(['assign', 'reject', 'delete'])
  action!: 'assign' | 'reject' | 'delete'

  @ApiPropertyOptional({ description: '分配给的销售ID（action=assign时必填）' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assignedUserId?: number
}
