import { IsOptional, IsString, IsInt, IsNumber, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class SearchProspectDto {
  @ApiPropertyOptional({ description: '企业名称/关键词' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ description: '行业' })
  @IsOptional()
  @IsString()
  industry?: string

  @ApiPropertyOptional({ description: '省份' })
  @IsOptional()
  @IsString()
  province?: string

  @ApiPropertyOptional({ description: '城市' })
  @IsOptional()
  @IsString()
  city?: string

  @ApiPropertyOptional({ description: '最低注册资本（万元）' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minRegisteredCapital?: number

  @ApiPropertyOptional({ description: '最高注册资本（万元）' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxRegisteredCapital?: number

  @ApiPropertyOptional({ description: '最低员工数' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minEmployeeCount?: number

  @ApiPropertyOptional({ description: '最高员工数' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxEmployeeCount?: number

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20
}
