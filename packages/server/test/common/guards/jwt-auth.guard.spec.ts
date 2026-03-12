import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard'

describe('JwtAuthGuard', () => {
  it('canActivate should delegate to parent AuthGuard implementation', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector
    const guard = new JwtAuthGuard(reflector)
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext
    const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype) as { canActivate?: unknown }
    const original = parentProto.canActivate
    const superMock = jest.fn().mockReturnValue(true)
    parentProto.canActivate = superMock

    try {
      const result = guard.canActivate(context)
      expect(superMock).toHaveBeenCalledWith(context)
      expect(result).toBe(true)
    } finally {
      parentProto.canActivate = original
    }
  })
})
