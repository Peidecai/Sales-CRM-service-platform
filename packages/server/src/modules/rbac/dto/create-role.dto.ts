import { IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateRoleDto {
  @ApiProperty({ description: '角色编码', example: 'custom_role' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string

  @ApiProperty({ description: '角色名称', example: '自定义角色' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @ApiPropertyOptional({ description: '显示名称', example: '自定义角色标签' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string

  @ApiPropertyOptional({ description: '角色描述' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string
}
