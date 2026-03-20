import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  MaxLength,
  Min,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ProductStatus } from '@crm/shared'

export class CreateProductDto {
  @ApiProperty({ description: '产品名称', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string

  @ApiProperty({ description: '产品编码', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  categoryId?: number

  @ApiProperty({ description: '标准单价', minimum: 0 })
  @IsNumber()
  @Min(0)
  price!: number

  @ApiProperty({ description: '单位', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit!: string

  @ApiPropertyOptional({ description: '产品状态', enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus

  @ApiPropertyOptional({ description: '产品描述' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: '规格参数 JSON' })
  @IsOptional()
  specs?: Record<string, unknown>
}
