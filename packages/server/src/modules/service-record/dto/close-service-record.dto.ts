import { IsInt, IsOptional, IsString, Min, Max, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CloseServiceRecordDto {
  @ApiProperty({ description: '满意度评分 (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  satisfactionScore!: number

  @ApiPropertyOptional({ description: '满意度评价', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  satisfactionComment?: string

  @ApiPropertyOptional({ description: '解决方案' })
  @IsString()
  @IsOptional()
  resolution?: string
}
