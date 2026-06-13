import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'
import { PermissionCacheService } from '../../modules/rbac/permission-cache.service'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionCacheService: PermissionCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<{ user: { id: number; role: string } }>()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('权限不足')
    }

    // Admin bypasses permission checks
    if (user.role === 'admin') {
      return true
    }

    const userPermissions = await this.permissionCacheService.getPermissionCodes(user.id)
    const hasPermission = requiredPermissions.some((p) => userPermissions.includes(p))

    if (!hasPermission) {
      throw new ForbiddenException('权限不足')
    }

    return true
  }
}
