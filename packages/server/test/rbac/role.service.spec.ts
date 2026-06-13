import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { RoleService } from '../../src/modules/rbac/role.service'
import { SysRole } from '../../src/modules/rbac/entities/sys-role.entity'
import { SysPermission } from '../../src/modules/rbac/entities/sys-permission.entity'
import { SysUserRole } from '../../src/modules/rbac/entities/sys-user-role.entity'
import { PermissionCacheService } from '../../src/modules/rbac/permission-cache.service'
import { createMockRepository } from '../test-utils'
import type { MockRepository } from '../test-utils'

describe('RoleService', () => {
  let service: RoleService
  let roleRepo: MockRepository
  let permissionRepo: MockRepository
  let userRoleRepo: MockRepository
  let permCacheService: { invalidateByRole: jest.Mock; getPermissionCodes: jest.Mock; invalidate: jest.Mock }

  beforeEach(async () => {
    permCacheService = {
      invalidateByRole: jest.fn().mockResolvedValue(undefined),
      getPermissionCodes: jest.fn().mockResolvedValue([]),
      invalidate: jest.fn().mockResolvedValue(undefined),
    }

    const module = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: getRepositoryToken(SysRole), useValue: createMockRepository() },
        { provide: getRepositoryToken(SysPermission), useValue: createMockRepository() },
        { provide: getRepositoryToken(SysUserRole), useValue: createMockRepository() },
        { provide: PermissionCacheService, useValue: permCacheService },
      ],
    }).compile()

    service = module.get(RoleService)
    roleRepo = module.get(getRepositoryToken(SysRole))
    permissionRepo = module.get(getRepositoryToken(SysPermission))
    userRoleRepo = module.get(getRepositoryToken(SysUserRole))
  })

  const mockRole = {
    id: 1, code: 'admin', name: '管理员', label: '超级管理员',
    isBuiltin: true, status: 'active', permissions: [], description: null,
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  }

  const mockCustomRole = {
    ...mockRole, id: 10, code: 'custom', name: '自定义', isBuiltin: false,
  }

  // findAll
  it('should return paginated role list', async () => {
    roleRepo.findAndCount.mockResolvedValue([[mockRole], 1])
    const result = await service.findAll(1, 10)
    expect(result).toEqual({ list: [mockRole], total: 1, page: 1, pageSize: 10 })
  })

  it('should default to page 1, pageSize 20', async () => {
    roleRepo.findAndCount.mockResolvedValue([[], 0])
    await service.findAll()
    expect(roleRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    )
  })

  // findOne
  it('should return role by id', async () => {
    roleRepo.findOne.mockResolvedValue(mockRole)
    const result = await service.findOne(1)
    expect(result).toBe(mockRole)
  })

  it('should throw NotFoundException when role not found', async () => {
    roleRepo.findOne.mockResolvedValue(null)
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
  })

  // create
  it('should create a new role', async () => {
    roleRepo.findOne.mockResolvedValue(null)
    roleRepo.create.mockReturnValue(mockCustomRole)
    roleRepo.save.mockResolvedValue(mockCustomRole)
    const result = await service.create({ code: 'custom', name: '自定义' })
    expect(result).toBe(mockCustomRole)
  })

  it('should throw BadRequestException if code exists', async () => {
    roleRepo.findOne.mockResolvedValueOnce(mockRole) // exists check
    await expect(service.create({ code: 'admin', name: 'test' })).rejects.toThrow(BadRequestException)
  })

  // update
  it('should update role', async () => {
    roleRepo.findOne.mockResolvedValue({ ...mockCustomRole })
    roleRepo.save.mockImplementation(async (r: unknown) => r)
    const result = await service.update(10, { name: '新名称' })
    expect((result as typeof mockCustomRole).name).toBe('新名称')
  })

  it('should block changing code of builtin role', async () => {
    roleRepo.findOne.mockResolvedValue({ ...mockRole })
    await expect(service.update(1, { code: 'new_code' })).rejects.toThrow(BadRequestException)
  })

  it('should allow updating builtin role name', async () => {
    roleRepo.findOne.mockResolvedValue({ ...mockRole })
    roleRepo.save.mockImplementation(async (r: unknown) => r)
    const result = await service.update(1, { name: '新管理员' })
    expect((result as typeof mockRole).name).toBe('新管理员')
  })

  // remove
  it('should soft-remove non-builtin role', async () => {
    roleRepo.findOne.mockResolvedValue(mockCustomRole)
    roleRepo.softRemove.mockResolvedValue(mockCustomRole)
    await service.remove(10)
    expect(roleRepo.softRemove).toHaveBeenCalledWith(mockCustomRole)
  })

  it('should block deleting builtin role', async () => {
    roleRepo.findOne.mockResolvedValue(mockRole)
    await expect(service.remove(1)).rejects.toThrow(BadRequestException)
  })

  // assignPermissions
  it('should assign permissions and invalidate cache', async () => {
    roleRepo.findOne.mockResolvedValue({ ...mockRole, permissions: [] })
    const perms = [{ id: 1, code: 'customer:customer:list' }, { id: 2, code: 'customer:customer:add' }]
    permissionRepo.find.mockResolvedValue(perms)
    roleRepo.save.mockImplementation(async (r: unknown) => r)

    const result = await service.assignPermissions(1, [1, 2])
    expect((result as typeof mockRole).permissions).toBe(perms)
    expect(permCacheService.invalidateByRole).toHaveBeenCalledWith(1)
  })

  it('should assign empty permissions', async () => {
    roleRepo.findOne.mockResolvedValue({ ...mockRole, permissions: [{ id: 1 }] })
    roleRepo.save.mockImplementation(async (r: unknown) => r)

    const result = await service.assignPermissions(1, [])
    expect((result as typeof mockRole).permissions).toEqual([])
  })

  // getUserRoles
  it('should return user roles', async () => {
    userRoleRepo.find.mockResolvedValue([{ userId: 1, roleId: 1 }])
    roleRepo.find.mockResolvedValue([mockRole])
    const result = await service.getUserRoles(1)
    expect(result).toEqual([mockRole])
  })

  it('should return empty array if user has no roles', async () => {
    userRoleRepo.find.mockResolvedValue([])
    const result = await service.getUserRoles(99)
    expect(result).toEqual([])
  })
})
