import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { RoleService } from './role.service'
import { PermissionService } from './permission.service'
import { CreateRoleDto } from './dto/create-role.dto'
import { UpdateRoleDto } from './dto/update-role.dto'
import { AssignPermissionsDto } from './dto/assign-permissions.dto'

@ApiTags('角色权限')
@ApiBearerAuth()
@Controller('rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class RbacController {
  constructor(
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
  ) {}

  // ─── Roles ─────────────────────────────────────────────────────────

  @Get('roles')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '角色列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAllRoles(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.roleService.findAll(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    )
  }

  @Post('roles')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '创建角色' })
  @ApiResponse({ status: 201, description: '创建成功' })
  createRole(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto)
  }

  @Get('roles/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '角色详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findOneRole(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findOne(id)
  }

  @Put('roles/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新角色' })
  @ApiResponse({ status: 200, description: '更新成功' })
  updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto)
  }

  @Delete('roles/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除角色' })
  @ApiResponse({ status: 200, description: '删除成功' })
  removeRole(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.remove(id)
  }

  @Post('roles/:id/permissions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '分配权限' })
  @ApiResponse({ status: 200, description: '分配成功' })
  assignPermissions(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignPermissionsDto) {
    return this.roleService.assignPermissions(id, dto.permissionIds)
  }

  // ─── Permissions ───────────────────────────────────────────────────

  @Get('permissions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '权限列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAllPermissions() {
    return this.permissionService.findAll()
  }

  @Get('permissions/tree')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '权限树' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getPermissionTree() {
    return this.permissionService.getTree()
  }

  @Get('permissions/me')
  @ApiOperation({ summary: '当前用户权限' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getCurrentUserPermissions(@CurrentUser('id') userId: number) {
    return this.permissionService.getCurrentUserPermissions(userId)
  }
}
