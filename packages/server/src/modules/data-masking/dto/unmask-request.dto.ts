import { IsString, IsInt } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UnmaskRequestDto {
  @ApiProperty({ description: '实体名称', example: 'customer' })
  @IsString()
  entityName!: string

  @ApiProperty({ description: '字段名称', example: 'phone' })
  @IsString()
  fieldName!: string

  @ApiProperty({ description: '记录ID' })
  @IsInt()
  recordId!: number
}
