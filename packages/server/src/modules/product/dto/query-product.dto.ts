import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { ProductStatus } from '@crm/shared'

export class QueryProductDto {
  @ApiPropertyOptional({ description: '页码', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ description: '每页条数', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20

  @ApiPropertyOptional({ description: '搜索关键字（名称/编码）' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number

  @ApiPropertyOptional({ description: '状态', enum: ProductStatus })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(ProductStatus)
  status?: ProductStatus
}
