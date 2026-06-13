import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SysRole } from './entities/sys-role.entity'
import { SysPermission } from './entities/sys-permission.entity'
import { SysUserRole } from './entities/sys-user-role.entity'
import { SysRoleDepartment } from './entities/sys-role-department.entity'
import { PermissionCacheService } from './permission-cache.service'
import { RoleService } from './role.service'
import { PermissionService } from './permission.service'
import { RbacController } from './rbac.controller'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SysRole, SysPermission, SysUserRole, SysRoleDepartment])],
  controllers: [RbacController],
  providers: [PermissionCacheService, RoleService, PermissionService],
  exports: [PermissionCacheService, RoleService, PermissionService],
})
export class RbacModule {}
