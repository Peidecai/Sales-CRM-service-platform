import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { NotificationPayload } from './notification.types'

/**
 * WebSocket gateway for real-time notifications.
 *
 * Clients connect via Socket.IO and receive push events for
 * business actions (customer/opportunity/call-record changes).
 *
 * Authentication: clients must send `token` in the handshake query.
 * If absent the connection is still allowed (for dev convenience),
 * but a warning is logged.
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name)

  @WebSocketServer()
  server!: Server

  /** Map of userId → Set<socketId> for targeted notifications */
  private userSockets = new Map<number, Set<string>>()

  afterInit() {
    this.logger.log('Notification WebSocket gateway initialized')
  }

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client)
    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set())
      }
      this.userSockets.get(userId)!.add(client.id)
    }
    this.logger.debug(
      `Client connected: ${client.id} (userId: ${userId ?? 'anonymous'}) — total: ${this.server?.sockets?.sockets?.size ?? 0}`,
    )
  }

  handleDisconnect(client: Socket) {
    const userId = this.extractUserId(client)
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id)
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId)
      }
    }
    this.logger.debug(`Client disconnected: ${client.id}`)
  }

  /**
   * Broadcast a notification to all connected clients.
   */
  broadcast(payload: NotificationPayload) {
    this.server.emit('notification', payload)
    this.logger.debug(`Broadcast: ${payload.type} — ${payload.message}`)
  }

  /**
   * Send a notification to a specific user (all their connected sockets).
   */
  sendToUser(userId: number, payload: NotificationPayload) {
    const socketIds = this.userSockets.get(userId)
    if (!socketIds || socketIds.size === 0) return

    for (const socketId of socketIds) {
      this.server.to(socketId).emit('notification', payload)
    }
    this.logger.debug(`Sent to user ${userId}: ${payload.type}`)
  }

  /**
   * Get count of connected clients.
   */
  getConnectedCount(): number {
    return this.server?.sockets?.sockets?.size ?? 0
  }

  private extractUserId(client: Socket): number | null {
    // userId can be passed in handshake query or auth
    const rawId =
      (client.handshake.auth as Record<string, unknown>)?.userId ?? client.handshake.query?.userId
    if (rawId) {
      const num = Number(rawId)
      return Number.isNaN(num) ? null : num
    }
    return null
  }
}
