import { Exclude, Expose } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { UserRole } from '@crm/shared'

/**
 * Response DTO for User entity.
 *
 * Uses @Exclude() on the class so that ALL fields are hidden by default,
 * then @Expose() whitelists only safe fields. This prevents accidental
 * leakage of password, deleted flag, or any future sensitive column.
 *
 * Usage:
 *   plainToInstance(UserResponseDto, userEntity, { excludeExtraneousValues: true })
 */
@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ description: '用户ID' })
  id!: number

  @Expose()
  @ApiProperty({ description: '用户名' })
  username!: string

  @Expose()
  @ApiProperty({ description: '姓名' })
  name!: string

  @Expose()
  @ApiProperty({ description: '邮箱', required: false })
  email!: string

  @Expose()
  @ApiProperty({ description: '手机号', required: false })
  phone!: string

  @Expose()
  @ApiProperty({ description: '角色', enum: UserRole })
  role!: UserRole

  @Expose()
  @ApiProperty({ description: '是否启用' })
  isActive!: boolean

  @Expose()
  @ApiProperty({ description: '创建时间' })
  createdAt!: Date

  // password, updatedAt, deleted — all excluded automatically
}
