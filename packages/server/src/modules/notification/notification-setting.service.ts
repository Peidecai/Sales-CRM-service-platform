import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NotificationSetting } from './entities/notification-setting.entity'
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto'

@Injectable()
export class NotificationSettingService {
  constructor(
    @InjectRepository(NotificationSetting)
    private readonly settingRepository: Repository<NotificationSetting>,
  ) {}

  async getSettings(userId: number): Promise<NotificationSetting> {
    let setting = await this.settingRepository.findOne({ where: { userId } })
    if (!setting) {
      setting = this.settingRepository.create({ userId })
      setting = await this.settingRepository.save(setting)
    }
    return setting
  }

  async updateSettings(
    userId: number,
    dto: UpdateNotificationSettingDto,
  ): Promise<NotificationSetting> {
    let setting = await this.settingRepository.findOne({ where: { userId } })
    if (!setting) {
      setting = this.settingRepository.create({ userId })
    }
    if (dto.emailEnabled !== undefined) setting.emailEnabled = dto.emailEnabled
    if (dto.wsEnabled !== undefined) setting.wsEnabled = dto.wsEnabled
    if (dto.smsEnabled !== undefined) setting.smsEnabled = dto.smsEnabled
    if (dto.mutedTypes !== undefined) setting.mutedTypes = dto.mutedTypes
    if (dto.quietHoursStart !== undefined) setting.quietHoursStart = dto.quietHoursStart
    if (dto.quietHoursEnd !== undefined) setting.quietHoursEnd = dto.quietHoursEnd
    return this.settingRepository.save(setting)
  }

  async shouldNotify(userId: number, type: string): Promise<boolean> {
    const setting = await this.settingRepository.findOne({ where: { userId } })
    if (!setting) return true // default: notify

    // Check muted types
    if (setting.mutedTypes && setting.mutedTypes.includes(type)) return false

    // Check quiet hours
    if (setting.quietHoursStart && setting.quietHoursEnd) {
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      const start = setting.quietHoursStart
      const end = setting.quietHoursEnd

      if (start <= end) {
        // Same day range: e.g. 22:00 - 23:00
        if (currentTime >= start && currentTime <= end) return false
      } else {
        // Cross-midnight: e.g. 22:00 - 08:00
        if (currentTime >= start || currentTime <= end) return false
      }
    }

    return true
  }
}
