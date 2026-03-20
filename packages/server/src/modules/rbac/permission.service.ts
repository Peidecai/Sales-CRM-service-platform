import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SysPermission } from './entities/sys-permission.entity'
import { PermissionCacheService } from './permission-cache.service'

export interface PermissionTreeNode {
  module: string
  label: string
  children: SysPermission[]
}

const MODULE_LABELS: Record<string, string> = {
  customer: '客户管理',
  opportunity: '商机管理',
  'call-record': '通话记录',
  knowledge: '知识库',
  system: '系统管理',
  product: '产品管理',
}

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(SysPermission)
    private readonly permissionRepo: Repository<SysPermission>,
    private readonly permissionCacheService: PermissionCacheService,
  ) {}

  async findAll(): Promise<SysPermission[]> {
    return this.permissionRepo.find({ order: { module: 'ASC', sort: 'ASC' } })
  }

  async getTree(): Promise<PermissionTreeNode[]> {
    const permissions = await this.findAll()
    const map = new Map<string, SysPermission[]>()
    for (const p of permissions) {
      const mod = p.module ?? 'other'
      if (!map.has(mod)) map.set(mod, [])
      map.get(mod)!.push(p)
    }
    const tree: PermissionTreeNode[] = []
    for (const [module, children] of map.entries()) {
      tree.push({
        module,
        label: MODULE_LABELS[module] ?? module,
        children,
      })
    }
    return tree
  }

  async getCurrentUserPermissions(userId: number): Promise<string[]> {
    return this.permissionCacheService.getPermissionCodes(userId)
  }
}
