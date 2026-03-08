import { ExecutionContext } from '@nestjs/common'
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard'

describe('JwtAuthGuard', () => {
  it('canActivate should delegate to parent AuthGuard implementation', () => {
    const guard = new JwtAuthGuard()
    const context = {} as ExecutionContext
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
