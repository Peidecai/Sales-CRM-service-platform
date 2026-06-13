import { IsNumber, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateCheckInDto {
  @ApiProperty({ description: '纬度', example: 31.2304 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number

  @ApiProperty({ description: '经度', example: 121.4737 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number

  @ApiProperty({ description: 'GPS 精度（米）', example: 15 })
  @IsNumber()
  @Min(0)
  accuracy!: number

  @ApiPropertyOptional({ description: '关联客户ID' })
  @IsOptional()
  @IsNumber()
  customerId?: number

  @ApiPropertyOptional({ description: '地址文本' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string

  @ApiPropertyOptional({ description: '签到照片 URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string
}
