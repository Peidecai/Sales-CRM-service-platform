import { IsArray, IsNumber, IsOptional, ArrayMinSize } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class OptimizeRouteDto {
  @ApiProperty({ description: '客户ID列表', type: [Number] })
  @IsArray()
  @ArrayMinSize(2)
  @IsNumber({}, { each: true })
  customerIds!: number[]

  @ApiPropertyOptional({ description: '起点纬度（当前位置）' })
  @IsNumber()
  @IsOptional()
  startLatitude?: number

  @ApiPropertyOptional({ description: '起点经度（当前位置）' })
  @IsNumber()
  @IsOptional()
  startLongitude?: number
}
