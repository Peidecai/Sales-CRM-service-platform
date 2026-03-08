import { ForbiddenException, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from '@crm/shared'
import { RolesGuard } from '../../../src/common/guards/roles.guard'

describe('RolesGuard', () => {
  const createContext = (role?: UserRole): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: role ? { role } : undefined,
        }),
      }),
    }) as unknown as ExecutionContext

  it('should allow when no role metadata is present', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector
    const guard = new RolesGuard(reflector)

    const result = guard.canActivate(createContext(UserRole.SALES))

    expect(result).toBe(true)
    expect(reflector.getAllAndOverride).toHaveBeenCalled()
  })

  it('should allow when user has one of required roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN, UserRole.MANAGER]),
    } as unknown as Reflector
    const guard = new RolesGuard(reflector)

    const result = guard.canActivate(createContext(UserRole.ADMIN))

    expect(result).toBe(true)
  })

  it('should throw ForbiddenException when user is missing', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector
    const guard = new RolesGuard(reflector)

    expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException)
  })

  it('should throw ForbiddenException when user role is not allowed', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector
    const guard = new RolesGuard(reflector)

    expect(() => guard.canActivate(createContext(UserRole.SALES))).toThrow(ForbiddenException)
  })
})
