import { IsArray, IsInt } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AssignPermissionsDto {
  @ApiProperty({ description: '权限 ID 列表', type: [Number], example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  permissionIds!: number[]
}
