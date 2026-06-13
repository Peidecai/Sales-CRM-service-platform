import { IsOptional, IsString, IsEnum, IsInt } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { ProspectStatus } from '@crm/shared'

export class UpdateProspectDto {
  @ApiPropertyOptional({ description: '线索状态', enum: ProspectStatus })
  @IsOptional()
  @IsEnum(ProspectStatus)
  status?: ProspectStatus

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string

  @ApiPropertyOptional({ description: '分配给的销售ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assignedUserId?: number
}
