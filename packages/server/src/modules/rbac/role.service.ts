import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { SysRole } from './entities/sys-role.entity'
import { SysPermission } from './entities/sys-permission.entity'
import { SysUserRole } from './entities/sys-user-role.entity'
import { PermissionCacheService } from './permission-cache.service'
import { CreateRoleDto } from './dto/create-role.dto'
import { UpdateRoleDto } from './dto/update-role.dto'

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(SysRole)
    private readonly roleRepo: Repository<SysRole>,
    @InjectRepository(SysPermission)
    private readonly permissionRepo: Repository<SysPermission>,
    @InjectRepository(SysUserRole)
    private readonly userRoleRepo: Repository<SysUserRole>,
    private readonly permissionCacheService: PermissionCacheService,
  ) {}

  async findAll(
    page = 1,
    pageSize = 20,
  ): Promise<{ list: SysRole[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.roleRepo.findAndCount({
      order: { createdAt: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      relations: ['permissions'],
    })
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<SysRole> {
    const role = await this.roleRepo.findOne({ where: { id }, relations: ['permissions'] })
    if (!role) throw new NotFoundException('角色不存在')
    return role
  }

  async create(dto: CreateRoleDto): Promise<SysRole> {
    const exists = await this.roleRepo.findOne({ where: { code: dto.code } })
    if (exists) throw new BadRequestException('角色编码已存在')
    const role = this.roleRepo.create(dto)
    return this.roleRepo.save(role)
  }

  async update(id: number, dto: UpdateRoleDto): Promise<SysRole> {
    const role = await this.findOne(id)
    if (role.isBuiltin && dto.code && dto.code !== role.code) {
      throw new BadRequestException('内置角色不能修改编码')
    }
    Object.assign(role, dto)
    return this.roleRepo.save(role)
  }

  async remove(id: number): Promise<void> {
    const role = await this.findOne(id)
    if (role.isBuiltin) throw new BadRequestException('内置角色不能删除')
    await this.roleRepo.softRemove(role)
  }

  async assignPermissions(roleId: number, permissionIds: number[]): Promise<SysRole> {
    const role = await this.findOne(roleId)
    const permissions =
      permissionIds.length > 0
        ? await this.permissionRepo.find({ where: { id: In(permissionIds) } })
        : []
    role.permissions = permissions
    const saved = await this.roleRepo.save(role)

    // Invalidate cache for all users with this role
    await this.permissionCacheService.invalidateByRole(roleId)

    return saved
  }

  async getUserRoles(userId: number): Promise<SysRole[]> {
    const userRoles = await this.userRoleRepo.find({ where: { userId } })
    if (userRoles.length === 0) return []
    const roleIds = userRoles.map((ur) => ur.roleId)
    return this.roleRepo.find({ where: { id: In(roleIds) }, relations: ['permissions'] })
  }
}
