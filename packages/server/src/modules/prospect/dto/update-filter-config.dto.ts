import { IsArray, IsString, IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CustomFilterDto {
  @IsString()
  key!: string

  @IsString()
  label!: string

  @IsString()
  type!: 'text' | 'number' | 'select' | 'dateRange'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[]
}

export class UpdateFilterConfigDto {
  @ApiProperty({ description: '启用的筛选字段列表' })
  @IsArray()
  @IsString({ each: true })
  enabledFilters!: string[]

  @ApiPropertyOptional({ description: '自定义筛选字段' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFilterDto)
  customFilters?: CustomFilterDto[]
}
