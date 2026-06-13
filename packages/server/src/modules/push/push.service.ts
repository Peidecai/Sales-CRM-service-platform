import { Injectable, Inject, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DeviceToken } from './entities/device-token.entity'
import { DevicePlatform } from './entities/device-token.entity'
import { PUSH_PROVIDER, PushProvider, PushPayload } from './interfaces/push-provider.interface'
import { UserRole } from '@crm/shared'

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name)

  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
    @Inject(PUSH_PROVIDER)
    private readonly pushProvider: PushProvider,
  ) {}

  async registerDevice(
    userId: number,
    deviceToken: string,
    platform: DevicePlatform,
  ): Promise<DeviceToken> {
    // Upsert: reactivate if exists
    const existing = await this.deviceTokenRepo.findOne({
      where: { deviceToken },
    })

    if (existing) {
      existing.userId = userId
      existing.platform = platform
      existing.isActive = true
      existing.lastUsedAt = new Date()
      return this.deviceTokenRepo.save(existing)
    }

    const token = this.deviceTokenRepo.create({
      userId,
      deviceToken,
      platform,
      isActive: true,
      lastUsedAt: new Date(),
    })
    return this.deviceTokenRepo.save(token)
  }

  async unregisterDevice(userId: number, deviceToken: string): Promise<void> {
    await this.deviceTokenRepo.update({ userId, deviceToken }, { isActive: false })
  }

  async getUserDevices(userId: number): Promise<DeviceToken[]> {
    return this.deviceTokenRepo.find({
      where: { userId, isActive: true },
      order: { lastUsedAt: 'DESC' },
    })
  }

  async sendToUser(userId: number, payload: PushPayload): Promise<void> {
    const devices = await this.deviceTokenRepo.find({
      where: { userId, isActive: true },
    })

    if (devices.length === 0) {
      this.logger.debug(`No active devices for user ${userId}`)
      return
    }

    const tokens = devices.map((d) => d.deviceToken)
    const results = await this.pushProvider.sendBatch(tokens, payload)

    // Deactivate tokens that failed with invalid token error
    for (let i = 0; i < results.length; i++) {
      if (!results[i].success && results[i].error === 'invalid_token') {
        await this.deviceTokenRepo.update({ id: devices[i].id }, { isActive: false })
      }
    }
  }

  async sendToRole(role: UserRole, payload: PushPayload): Promise<void> {
    const devices = await this.deviceTokenRepo
      .createQueryBuilder('dt')
      .innerJoin('users', 'u', 'u.id = dt.user_id')
      .where('u.role = :role', { role })
      .andWhere('dt.is_active = :active', { active: true })
      .getMany()

    if (devices.length === 0) {
      this.logger.debug(`No active devices for role ${role}`)
      return
    }

    const tokens = devices.map((d) => d.deviceToken)
    await this.pushProvider.sendBatch(tokens, payload)
  }
}
