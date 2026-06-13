import 'reflect-metadata'
import { UserRole } from '@crm/shared'
import { ROLES_KEY } from '../../src/common/decorators/roles.decorator'
import { UserController } from '../../src/modules/user/user.controller'

describe('UserController', () => {
  let controller: UserController
  let userService: {
    create: jest.Mock
    findAll: jest.Mock
    findOne: jest.Mock
    update: jest.Mock
    remove: jest.Mock
  }

  beforeEach(() => {
    userService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    }

    controller = new UserController(userService as never)
  })

  it('create should delegate to service', async () => {
    const dto = { username: 'alice', role: UserRole.SALES }
    const created = { id: 1, ...dto }
    userService.create.mockResolvedValue(created)

    const result = await controller.create(dto as never)

    expect(userService.create).toHaveBeenCalledWith(dto)
    expect(result).toEqual(created)
  })

  it('findAll should delegate to service', async () => {
    const query = { page: 1, pageSize: 20 }
    const pageData = { list: [{ id: 1 }], total: 1, page: 1, pageSize: 20 }
    userService.findAll.mockResolvedValue(pageData)

    const result = await controller.findAll(query as never)

    expect(userService.findAll).toHaveBeenCalledWith(query)
    expect(result).toBe(pageData)
  })

  it('findOne should delegate to service', async () => {
    userService.findOne.mockResolvedValue({ id: 2, username: 'bob' })

    const result = await controller.findOne(2)

    expect(userService.findOne).toHaveBeenCalledWith(2)
    expect(result).toEqual({ id: 2, username: 'bob' })
  })

  it('update should delegate to service', async () => {
    const dto = { name: 'Bobby' }
    userService.update.mockResolvedValue({ id: 2, name: 'Bobby' })

    const result = await controller.update(2, dto as never)

    expect(userService.update).toHaveBeenCalledWith(2, dto)
    expect(result).toEqual({ id: 2, name: 'Bobby' })
  })

  it('remove should delegate to service', async () => {
    userService.remove.mockResolvedValue(null)

    const result = await controller.remove(2)

    expect(userService.remove).toHaveBeenCalledWith(2)
    expect(result).toBeNull()
  })

  it('should require ADMIN or MANAGER on findOne', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, UserController.prototype.findOne) as UserRole[]
    expect(roles).toEqual([UserRole.ADMIN, UserRole.MANAGER])
  })
})
