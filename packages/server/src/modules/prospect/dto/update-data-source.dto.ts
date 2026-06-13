import { PartialType } from '@nestjs/swagger'
import { IsOptional, IsBoolean } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { CreateDataSourceDto } from './create-data-source.dto'

export class UpdateDataSourceDto extends PartialType(CreateDataSourceDto) {
  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean
}
