import 'reflect-metadata'
import { ExecutionContext } from '@nestjs/common'
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants'
import { CurrentUser } from '../../../src/common/decorators/current-user.decorator'

describe('CurrentUser decorator factory', () => {
  const user = {
    id: 10,
    username: 'alice',
    role: 'admin',
  }

  const createContext = (u?: typeof user) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: u }),
      }),
    }) as unknown as ExecutionContext

  const getFactory = (data: 'id' | 'username' | undefined) => {
    class TestController {
      method(_user: unknown): void {}
    }

    CurrentUser(data)(TestController.prototype, 'method', 0)

    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestController,
      'method',
    ) as Record<string, { factory: Function }>
    const key = Object.keys(metadata)[0]
    return metadata[key].factory as (d: string | undefined, c: ExecutionContext) => unknown
  }

  it('should return the full user when no field is provided', () => {
    const factory = getFactory(undefined)
    const result = factory(undefined, createContext(user))
    expect(result).toEqual(user)
  })

  it('should return a specific user field when requested', () => {
    const factory = getFactory('id')
    const result = factory('id', createContext(user))
    expect(result).toBe(10)
  })

  it('should return undefined for missing user data', () => {
    const factory = getFactory('username')
    const result = factory('username', createContext(undefined))
    expect(result).toBeUndefined()
  })
})
