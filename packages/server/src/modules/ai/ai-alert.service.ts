import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserRole } from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { AiAlert } from './entities/ai-alert.entity'
import { Customer } from '../customer/customer.entity'

@Injectable()
export class AiAlertService {
  constructor(
    @InjectRepository(AiAlert)
    private readonly alertRepo: Repository<AiAlert>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async getAlerts(status?: string, alertType?: string, page = 1, pageSize = 20, user?: AuthUser) {
    const qb = this.alertRepo.createQueryBuilder('alert')

    if (status) qb.andWhere('alert.status = :status', { status })
    if (alertType) qb.andWhere('alert.alertType = :alertType', { alertType })

    if (user && user.role === UserRole.SALES) {
      qb.andWhere(
        'alert.customerId IN (SELECT id FROM customers WHERE assigned_user_id = :uid AND deleted_at IS NULL)',
        { uid: user.id },
      )
    }

    qb.orderBy('alert.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async acknowledgeAlert(id: number, user?: AuthUser) {
    const alert = await this.alertRepo.findOne({ where: { id } })
    if (!alert) throw new NotFoundException('告警不存在')
    await this.checkOwnership(alert, user)

    alert.status = 'acknowledged'
    alert.acknowledgedAt = new Date()
    await this.alertRepo.save(alert)
    return alert
  }

  async resolveAlert(id: number, user?: AuthUser) {
    const alert = await this.alertRepo.findOne({ where: { id } })
    if (!alert) throw new NotFoundException('告警不存在')
    await this.checkOwnership(alert, user)

    alert.status = 'resolved'
    alert.resolvedAt = new Date()
    await this.alertRepo.save(alert)
    return alert
  }

  private async checkOwnership(alert: AiAlert, user?: AuthUser): Promise<void> {
    if (!user || user.role !== UserRole.SALES || !alert.customerId) return
    const customer = await this.customerRepo.findOne({
      where: { id: alert.customerId },
    })
    if (!customer || customer.assignedUserId !== user.id) {
      throw new ForbiddenException('您无权操作此告警')
    }
  }
}
