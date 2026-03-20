import { IsArray, ValidateNested, IsInt, IsPositive, IsNumber, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class LinkProductItemDto {
  @ApiProperty({ description: '产品ID' })
  @IsInt()
  @IsPositive()
  productId!: number

  @ApiProperty({ description: '数量', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number

  @ApiProperty({ description: '成交单价', minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice!: number

  @ApiProperty({ description: '折扣百分比 (0-100)', default: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  discount!: number
}

export class LinkProductDto {
  @ApiProperty({ description: '产品列表', type: [LinkProductItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkProductItemDto)
  items!: LinkProductItemDto[]
}
