import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Server, Socket } from 'socket.io'
import { randomUUID } from 'crypto'
import { NotificationPayload } from './notification.types'
import { TokenService } from '../auth/token.service'

function resolveWsCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3001'
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

interface NotificationJwtPayload {
  sub: number
  username: string
  role: string
  iat?: number
  exp?: number
}

/**
 * WebSocket gateway for real-time notifications.
 *
 * Clients connect via Socket.IO and receive push events for
 * business actions (customer/opportunity/call-record changes).
 *
 * Authentication: clients must provide a valid JWT token in handshake auth/query.
 */
@WebSocketGateway({
  cors: {
    origin: resolveWsCorsOrigins(),
    credentials: true,
  },
  namespace: '/ws/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name)

  @WebSocketServer()
  server!: Server

  /** Map of userId -> Set<socketId> for targeted notifications */
  private userSockets = new Map<number, Set<string>>()

  /** Map of socketId -> userId for cleanup on disconnect */
  private socketUsers = new Map<string, number>()

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {}

  afterInit() {
    this.logger.log('Notification WebSocket gateway initialized')
  }

  async handleConnection(client: Socket) {
    const token = this.extractToken(client)
    if (!token) {
      this.logger.warn(`WebSocket rejected (missing token): ${client.id}`)
      client.disconnect(true)
      return
    }

    const userId = await this.validateTokenAndGetUserId(token)
    if (!userId) {
      this.logger.warn(`WebSocket rejected (invalid token): ${client.id}`)
      client.disconnect(true)
      return
    }

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set())
    }
    this.userSockets.get(userId)!.add(client.id)
    this.socketUsers.set(client.id, userId)

    this.logger.debug(`Client connected: ${client.id} (userId: ${userId})`)
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id)
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id)
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId)
      }
    }
    this.socketUsers.delete(client.id)
    this.logger.debug(`Client disconnected: ${client.id}`)
  }

  /**
   * Broadcast a notification to all connected clients.
   * Automatically assigns an eventId if not already present.
   */
  broadcast(payload: NotificationPayload) {
    const enriched = this.ensureEventId(payload)
    this.server.emit('notification', enriched)
    this.logger.debug(
      `Broadcast: ${enriched.type} - ${enriched.message} (eventId: ${enriched.eventId})`,
    )
  }

  /**
   * Send a notification to a specific user (all their connected sockets).
   * Automatically assigns an eventId if not already present.
   */
  sendToUser(userId: number, payload: NotificationPayload) {
    const socketIds = this.userSockets.get(userId)
    if (!socketIds || socketIds.size === 0) return

    const enriched = this.ensureEventId(payload)
    for (const socketId of socketIds) {
      this.server.to(socketId).emit('notification', enriched)
    }
    this.logger.debug(`Sent to user ${userId}: ${enriched.type} (eventId: ${enriched.eventId})`)
  }

  /**
   * Emit a named event to a specific user (e.g. INCOMING_CALL_POPUP).
   */
  emitToUser<T>(userId: number, eventName: string, payload: T) {
    const socketIds = this.userSockets.get(userId)
    if (!socketIds || socketIds.size === 0) return

    for (const socketId of socketIds) {
      this.server.to(socketId).emit(eventName, payload)
    }
    this.logger.debug(`Emit ${eventName} to user ${userId}`)
  }

  /**
   * Get count of connected clients.
   */
  getConnectedCount(): number {
    return this.server?.sockets?.sockets?.size ?? 0
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, unknown> | undefined
    const tokenFromAuth = auth?.token
    if (typeof tokenFromAuth === 'string' && tokenFromAuth.trim()) {
      return tokenFromAuth.trim()
    }

    const tokenFromQuery = client.handshake.query?.token
    if (typeof tokenFromQuery === 'string' && tokenFromQuery.trim()) {
      return tokenFromQuery.trim()
    }

    return null
  }

  private async validateTokenAndGetUserId(token: string): Promise<number | null> {
    try {
      const payload = this.jwtService.verify<NotificationJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'dev-secret-key'),
      })
      if (!payload?.sub) {
        return null
      }

      const isBlacklisted = await this.tokenService.isTokenBlacklisted(token)
      if (isBlacklisted) {
        return null
      }

      return payload.sub
    } catch {
      return null
    }
  }

  /** Assign a UUID eventId if not already present */
  private ensureEventId(payload: NotificationPayload): NotificationPayload {
    if (payload.eventId) return payload
    return { ...payload, eventId: randomUUID() }
  }
}
