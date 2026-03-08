import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Logger } from '@nestjs/common'
import { NotificationGateway } from '../../src/modules/notification/notification.gateway'
import { AuthService } from '../../src/modules/auth/auth.service'
import { NotificationType } from '../../src/modules/notification/notification.types'

describe('NotificationGateway', () => {
  let gateway: NotificationGateway
  let jwtService: { verify: jest.Mock }
  let configService: { get: jest.Mock }
  let authService: { isTokenBlacklisted: jest.Mock }

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    }
    configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    }
    authService = {
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    }

    gateway = new NotificationGateway(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      authService as unknown as AuthService,
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('afterInit should log initialization', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})

    gateway.afterInit()

    expect(logSpy).toHaveBeenCalled()
  })

  it('should disconnect client when token is missing', async () => {
    const client = {
      id: 'socket-1',
      handshake: { auth: {}, query: {} },
      disconnect: jest.fn(),
    }

    await gateway.handleConnection(client as never)

    expect(client.disconnect).toHaveBeenCalledWith(true)
    expect(jwtService.verify).not.toHaveBeenCalled()
  })

  it('should disconnect client when token is invalid', async () => {
    const client = {
      id: 'socket-2',
      handshake: { auth: { token: 'bad-token' }, query: {} },
      disconnect: jest.fn(),
    }
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid token')
    })

    await gateway.handleConnection(client as never)

    expect(client.disconnect).toHaveBeenCalledWith(true)
  })

  it('should disconnect client when payload does not contain sub', async () => {
    const client = {
      id: 'socket-5',
      handshake: { auth: { token: 'no-sub-token' }, query: {} },
      disconnect: jest.fn(),
    }
    jwtService.verify.mockReturnValue({ username: 'u', role: 'sales' })

    await gateway.handleConnection(client as never)

    expect(client.disconnect).toHaveBeenCalledWith(true)
  })

  it('should trust user id from JWT sub, not handshake userId', async () => {
    const client = {
      id: 'socket-3',
      handshake: { auth: { token: 'good-token', userId: 999 }, query: {} },
      disconnect: jest.fn(),
    }
    jwtService.verify.mockReturnValue({ sub: 123, username: 'u1', role: 'sales' })

    await gateway.handleConnection(client as never)

    const userSockets = (gateway as unknown as { userSockets: Map<number, Set<string>> }).userSockets
    expect(userSockets.has(999)).toBe(false)
    expect(userSockets.has(123)).toBe(true)
    expect(userSockets.get(123)?.has('socket-3')).toBe(true)
    expect(client.disconnect).not.toHaveBeenCalled()
  })

  it('should accept token from query and trim whitespace', async () => {
    const client = {
      id: 'socket-6',
      handshake: { auth: {}, query: { token: '  query-token  ' } },
      disconnect: jest.fn(),
    }
    jwtService.verify.mockReturnValue({ sub: 321, username: 'u2', role: 'manager' })

    await gateway.handleConnection(client as never)

    expect(jwtService.verify).toHaveBeenCalledWith('query-token', expect.any(Object))
    expect(client.disconnect).not.toHaveBeenCalled()
  })

  it('should disconnect client when token is blacklisted', async () => {
    const client = {
      id: 'socket-4',
      handshake: { auth: { token: 'revoked-token' }, query: {} },
      disconnect: jest.fn(),
    }
    jwtService.verify.mockReturnValue({ sub: 1, username: 'u1', role: 'sales' })
    authService.isTokenBlacklisted.mockResolvedValue(true)

    await gateway.handleConnection(client as never)

    expect(client.disconnect).toHaveBeenCalledWith(true)
  })

  it('handleDisconnect should cleanup socket mapping and remove empty user set', async () => {
    const client = {
      id: 'socket-7',
      handshake: { auth: { token: 'good-7' }, query: {} },
      disconnect: jest.fn(),
    }
    jwtService.verify.mockReturnValue({ sub: 777, username: 'u7', role: 'sales' })

    await gateway.handleConnection(client as never)
    gateway.handleDisconnect(client as never)

    const userSockets = (gateway as unknown as { userSockets: Map<number, Set<string>> }).userSockets
    const socketUsers = (gateway as unknown as { socketUsers: Map<string, number> }).socketUsers
    expect(userSockets.has(777)).toBe(false)
    expect(socketUsers.has('socket-7')).toBe(false)
  })

  it('handleDisconnect should do nothing for unknown socket', () => {
    const client = {
      id: 'unknown-socket',
      handshake: { auth: {}, query: {} },
      disconnect: jest.fn(),
    }

    expect(() => gateway.handleDisconnect(client as never)).not.toThrow()
  })

  it('broadcast should emit notification event', () => {
    const emit = jest.fn()
    ;(gateway as unknown as { server: { emit: jest.Mock } }).server = { emit }

    gateway.broadcast({
      type: NotificationType.CUSTOMER_CREATED,
      actorId: 1,
      actorName: 'alice',
      resource: 'customer',
      resourceId: 10,
      message: 'created',
      timestamp: new Date().toISOString(),
    })

    expect(emit).toHaveBeenCalledWith('notification', expect.objectContaining({
      type: NotificationType.CUSTOMER_CREATED,
    }))
  })

  it('sendToUser should emit to all user sockets', async () => {
    const clientA = {
      id: 'socket-a',
      handshake: { auth: { token: 't-a' }, query: {} },
      disconnect: jest.fn(),
    }
    const clientB = {
      id: 'socket-b',
      handshake: { auth: { token: 't-b' }, query: {} },
      disconnect: jest.fn(),
    }
    jwtService.verify.mockReturnValue({ sub: 88, username: 'u88', role: 'sales' })

    await gateway.handleConnection(clientA as never)
    await gateway.handleConnection(clientB as never)

    const emitA = jest.fn()
    const emitB = jest.fn()
    const to = jest.fn((socketId: string) => (socketId === 'socket-a' ? { emit: emitA } : { emit: emitB }))
    ;(gateway as unknown as { server: { to: jest.Mock } }).server = { to }

    gateway.sendToUser(88, {
      type: NotificationType.CALL_RECORD_CREATED,
      actorId: 1,
      actorName: 'alice',
      resource: 'call_record',
      resourceId: 9,
      message: 'created',
      timestamp: new Date().toISOString(),
    })

    expect(to).toHaveBeenCalledWith('socket-a')
    expect(to).toHaveBeenCalledWith('socket-b')
    expect(emitA).toHaveBeenCalledWith('notification', expect.any(Object))
    expect(emitB).toHaveBeenCalledWith('notification', expect.any(Object))
  })

  it('sendToUser should return early when user has no active sockets', () => {
    const to = jest.fn()
    ;(gateway as unknown as { server: { to: jest.Mock } }).server = { to }

    gateway.sendToUser(404, {
      type: NotificationType.CALL_RECORD_CREATED,
      actorId: 1,
      actorName: 'alice',
      resource: 'call_record',
      resourceId: 9,
      message: 'created',
      timestamp: new Date().toISOString(),
    })

    expect(to).not.toHaveBeenCalled()
  })

  it('getConnectedCount should return socket size and fallback to 0', () => {
    ;(gateway as unknown as { server: { sockets: { sockets: Set<string> } } }).server = {
      sockets: { sockets: new Set(['a', 'b', 'c']) },
    }
    expect(gateway.getConnectedCount()).toBe(3)

    ;(gateway as unknown as { server: unknown }).server = undefined as never
    expect(gateway.getConnectedCount()).toBe(0)
  })
})
