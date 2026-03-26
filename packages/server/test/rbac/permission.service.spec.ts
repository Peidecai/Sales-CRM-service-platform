import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { PermissionService } from '../../src/modules/rbac/permission.service'
import { SysPermission } from '../../src/modules/rbac/entities/sys-permission.entity'
import { PermissionCacheService } from '../../src/modules/rbac/permission-cache.service'
import { createMockRepository } from '../test-utils'
import type { MockRepository } from '../test-utils'

describe('PermissionService', () => {
  let service: PermissionService
  let permRepo: MockRepository
  let permCacheService: { getPermissionCodes: jest.Mock; invalidate: jest.Mock; invalidateByRole: jest.Mock }

  const mockPerms = [
    { id: 1, code: 'customer:customer:list', name: '客户列表', resource: 'customer', action: 'list', module: 'customer', sort: 1 },
    { id: 2, code: 'customer:customer:add', name: '新增客户', resource: 'customer', action: 'add', module: 'customer', sort: 2 },
    { id: 3, code: 'system:user:list', name: '用户列表', resource: 'user', action: 'list', module: 'system', sort: 1 },
    { id: 4, code: 'opportunity:opportunity:list', name: '商机列表', resource: 'opportunity', action: 'list', module: 'opportunity', sort: 1 },
  ]

  beforeEach(async () => {
    permCacheService = {
      getPermissionCodes: jest.fn().mockResolvedValue(['customer:customer:list']),
      invalidate: jest.fn(),
      invalidateByRole: jest.fn(),
    }

    const module = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: getRepositoryToken(SysPermission), useValue: createMockRepository() },
        { provide: PermissionCacheService, useValue: permCacheService },
      ],
    }).compile()

    service = module.get(PermissionService)
    permRepo = module.get(getRepositoryToken(SysPermission))
  })

  // findAll
  it('should return all permissions ordered by module and sort', async () => {
    permRepo.find.mockResolvedValue(mockPerms)
    const result = await service.findAll()
    expect(result).toEqual(mockPerms)
    expect(permRepo.find).toHaveBeenCalledWith({ order: { module: 'ASC', sort: 'ASC' } })
  })

  it('should return empty array when no permissions exist', async () => {
    permRepo.find.mockResolvedValue([])
    const result = await service.findAll()
    expect(result).toEqual([])
  })

  // getTree
  it('should group permissions by module', async () => {
    permRepo.find.mockResolvedValue(mockPerms)
    const tree = await service.getTree()
    expect(tree.length).toBe(3) // customer, system, opportunity
    const customerNode = tree.find((n) => n.module === 'customer')
    expect(customerNode).toBeDefined()
    expect(customerNode!.children.length).toBe(2)
    expect(customerNode!.label).toBe('客户管理')
  })

  it('should use module name as label when no label mapping exists', async () => {
    permRepo.find.mockResolvedValue([
      { id: 10, code: 'custom:item:list', name: 'List', resource: 'item', action: 'list', module: 'custom', sort: 1 },
    ])
    const tree = await service.getTree()
    expect(tree[0].label).toBe('custom')
  })

  it('should handle permissions with null module', async () => {
    permRepo.find.mockResolvedValue([
      { id: 10, code: 'test:test:list', name: 'Test', resource: 'test', action: 'list', module: null, sort: 1 },
    ])
    const tree = await service.getTree()
    expect(tree[0].module).toBe('other')
  })

  it('should return empty tree when no permissions', async () => {
    permRepo.find.mockResolvedValue([])
    const tree = await service.getTree()
    expect(tree).toEqual([])
  })

  it('should map system module label correctly', async () => {
    permRepo.find.mockResolvedValue([mockPerms[2]])
    const tree = await service.getTree()
    expect(tree[0].label).toBe('系统管理')
  })

  // getCurrentUserPermissions
  it('should delegate to PermissionCacheService', async () => {
    const result = await service.getCurrentUserPermissions(1)
    expect(result).toEqual(['customer:customer:list'])
    expect(permCacheService.getPermissionCodes).toHaveBeenCalledWith(1)
  })

  it('should return empty array for user with no permissions', async () => {
    permCacheService.getPermissionCodes.mockResolvedValue([])
    const result = await service.getCurrentUserPermissions(99)
    expect(result).toEqual([])
  })

  it('should return multiple permissions for admin user', async () => {
    permCacheService.getPermissionCodes.mockResolvedValue([
      'customer:customer:list',
      'system:user:list',
      'opportunity:opportunity:list',
    ])
    const result = await service.getCurrentUserPermissions(2)
    expect(result.length).toBe(3)
  })
})
