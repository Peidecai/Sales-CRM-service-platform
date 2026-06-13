import { PartialType } from '@nestjs/swagger'
import { CreateRoleDto } from './create-role.dto'
import { IsOptional, IsEnum } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @ApiPropertyOptional({ description: '角色状态', enum: ['active', 'disabled'] })
  @IsOptional()
  @IsEnum(['active', 'disabled'])
  status?: 'active' | 'disabled'
}
