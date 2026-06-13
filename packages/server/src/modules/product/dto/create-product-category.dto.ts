import { IsString, IsNotEmpty, IsOptional, IsInt, Min, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateProductCategoryDto {
  @ApiProperty({ description: '分类名称', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @ApiPropertyOptional({ description: '父分类ID' })
  @IsOptional()
  @IsInt()
  parentId?: number

  @ApiPropertyOptional({ description: '排序序号', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number
}
