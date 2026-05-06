import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RedisService } from '../../common/redis'
import { SysUserRole } from './entities/sys-user-role.entity'
import { SysRole } from './entities/sys-role.entity'

const PERMISSION_CACHE_TTL = 1800 // 30 minutes
const CACHE_KEY_PREFIX = 'user_permissions'

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name)

  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(SysUserRole)
    private readonly userRoleRepo: Repository<SysUserRole>,
    @InjectRepository(SysRole)
    private readonly roleRepo: Repository<SysRole>,
  ) {}

  /**
   * Get all permission codes for a user. Cached in Redis for 30 minutes.
   */
  async getPermissionCodes(userId: number): Promise<string[]> {
    const cacheKey = `${CACHE_KEY_PREFIX}:${userId}`
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) {
      return JSON.parse(cached) as string[]
    }

    // Redis miss/error 时回源查询 RBAC 表，保证权限判断不依赖缓存可用性。
    const userRoles = await this.userRoleRepo.find({ where: { userId } })
    if (userRoles.length === 0) return []

    const roleIds = userRoles.map((ur) => ur.roleId)
    const roles = await this.roleRepo
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .whereInIds(roleIds)
      .getMany()

    const codes = [...new Set(roles.flatMap((r) => r.permissions?.map((p) => p.code) ?? []))]

    await this.redisService.set(cacheKey, JSON.stringify(codes), PERMISSION_CACHE_TTL)
    return codes
  }

  /**
   * Invalidate cached permissions for a user. Call when roles/permissions change.
   */
  async invalidate(userId: number): Promise<void> {
    await this.redisService.del(`${CACHE_KEY_PREFIX}:${userId}`)
  }

  /**
   * Invalidate permissions for all users with a specific role.
   */
  async invalidateByRole(roleId: number): Promise<void> {
    const userRoles = await this.userRoleRepo.find({ where: { roleId } })
    // 角色权限变更会影响所有绑定用户，只能逐个用户清缓存。
    for (const ur of userRoles) {
      await this.invalidate(ur.userId)
    }
  }
}
