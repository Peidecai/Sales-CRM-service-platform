import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Cron } from '@nestjs/schedule'
import { PaymentStatus, ContractStatus, UserRole } from '@crm/shared'
import type { PageResult } from '@crm/shared'
import { Payment } from './entities/payment.entity'
import { Contract } from '../contract/entities/contract.entity'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { UpdatePaymentDto } from './dto/update-payment.dto'
import { QueryPaymentDto } from './dto/query-payment.dto'
import { ConfirmPaymentDto } from './dto/confirm-payment.dto'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { NotificationService } from '../notification/notification.service'

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name)

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── Payment No Generator ─────────────────────────────────────────────

  private async generatePaymentNo(): Promise<string> {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const todayCount = await this.paymentRepository
      .createQueryBuilder('p')
      .where('p.createdAt >= :start', { start: startOfDay })
      .andWhere('p.createdAt < :end', { end: endOfDay })
      .setLock('pessimistic_write')
      .getCount()

    const seq = String(todayCount + 1).padStart(4, '0')
    return `PAY-${dateStr}-${seq}`
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────

  async create(dto: CreatePaymentDto, user: AuthUser): Promise<Payment> {
    const paymentNo = await this.generatePaymentNo()
    const payment = this.paymentRepository.create({
      ...dto,
      paymentNo,
      createdBy: user.id,
      isOverdue: dto.isOverdue ?? false,
      overdueDays: 0,
      status: dto.status ?? PaymentStatus.PLANNED,
    })
    return this.paymentRepository.save(payment)
  }

  async findAll(query: QueryPaymentDto, user: AuthUser): Promise<PageResult<Payment>> {
    const { page = 1, pageSize = 20, contractId, customerId, ownerId, status, isOverdue } = query

    const qb = this.paymentRepository.createQueryBuilder('p')

    // SALES users can only see their own payments
    if (user.role === UserRole.SALES) {
      qb.andWhere('p.ownerId = :currentUserId', { currentUserId: user.id })
    }

    if (contractId) {
      qb.andWhere('p.contractId = :contractId', { contractId })
    }
    if (customerId) {
      qb.andWhere('p.customerId = :customerId', { customerId })
    }
    if (ownerId) {
      qb.andWhere('p.ownerId = :ownerId', { ownerId })
    }
    if (status) {
      qb.andWhere('p.status = :status', { status })
    }
    if (isOverdue !== undefined) {
      qb.andWhere('p.isOverdue = :isOverdue', { isOverdue })
    }

    qb.orderBy('p.plannedDate', 'ASC')
      .addOrderBy('p.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number, user?: AuthUser): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
    })
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`)
    }
    if (user && user.role === UserRole.SALES && payment.ownerId !== user.id) {
      throw new ForbiddenException('无权访问此回款记录')
    }
    return payment
  }

  async update(id: number, dto: UpdatePaymentDto, user?: AuthUser): Promise<Payment> {
    const payment = await this.findOne(id, user)
    Object.assign(payment, dto)
    return this.paymentRepository.save(payment)
  }

  async remove(id: number, user?: AuthUser): Promise<void> {
    const payment = await this.findOne(id, user)
    await this.paymentRepository.softRemove(payment)
  }

  // ─── Confirm Payment Arrival ──────────────────────────────────────────

  async confirmPayment(id: number, dto: ConfirmPaymentDto, user: AuthUser): Promise<Payment> {
    const payment = await this.findOne(id, user)

    const contract = await this.contractRepository.findOne({
      where: { id: payment.contractId },
    })
    if (!contract) {
      throw new NotFoundException(`Contract with ID ${payment.contractId} not found`)
    }

    return this.dataSource.transaction(async (manager) => {
      payment.actualAmount = dto.actualAmount
      payment.actualDate = new Date(dto.actualDate)
      payment.paymentMethod = dto.paymentMethod
      payment.bankTransactionNo = dto.bankTransactionNo ?? payment.bankTransactionNo
      payment.status = PaymentStatus.CONFIRMED
      payment.confirmUserId = user.id
      payment.confirmedAt = new Date()

      const savedPayment = await manager.save(Payment, payment)

      // Update contract paidAmount
      const newPaidAmount =
        parseFloat(String(contract.paidAmount)) + parseFloat(String(dto.actualAmount))
      contract.paidAmount = newPaidAmount

      // Auto-complete contract if fully paid
      if (
        newPaidAmount >= parseFloat(String(contract.totalAmount)) &&
        contract.status === ContractStatus.EXECUTING
      ) {
        contract.status = ContractStatus.COMPLETED
      }

      await manager.save(Contract, contract)

      return savedPayment
    })
  }

  // ─── Overdue Payments ─────────────────────────────────────────────────

  async getOverduePayments(): Promise<Payment[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return this.paymentRepository
      .createQueryBuilder('p')
      .andWhere('p.status = :status', { status: PaymentStatus.PLANNED })
      .andWhere('p.plannedDate < :today', { today })
      .orderBy('p.plannedDate', 'ASC')
      .getMany()
  }

  async getOverdueList(page = 1, pageSize = 20): Promise<PageResult<Payment>> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const qb = this.paymentRepository
      .createQueryBuilder('p')
      .andWhere('p.status = :status', { status: PaymentStatus.PLANNED })
      .andWhere('p.plannedDate < :today', { today })
      .orderBy('p.plannedDate', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  // ─── Statistics ───────────────────────────────────────────────────────

  async getStatistics(filter: {
    startDate?: string
    endDate?: string
    ownerId?: number
    customerId?: number
  }): Promise<{
    totalPlanned: number
    totalReceived: number
    overdueAmount: number
    overdueRate: number
    collectionRate: number
  }> {
    const qb = this.paymentRepository.createQueryBuilder('p')

    if (filter.startDate) {
      qb.andWhere('p.plannedDate >= :startDate', { startDate: filter.startDate })
    }
    if (filter.endDate) {
      qb.andWhere('p.plannedDate <= :endDate', { endDate: filter.endDate })
    }
    if (filter.ownerId) {
      qb.andWhere('p.ownerId = :ownerId', { ownerId: filter.ownerId })
    }
    if (filter.customerId) {
      qb.andWhere('p.customerId = :customerId', { customerId: filter.customerId })
    }

    const raw = await qb
      .select('SUM(p.plannedAmount)', 'totalPlanned')
      .addSelect(
        'SUM(CASE WHEN p.status = :confirmed THEN p.actualAmount ELSE 0 END)',
        'totalReceived',
      )
      .addSelect(
        'SUM(CASE WHEN p.is_overdue = 1 THEN p.planned_amount ELSE 0 END)',
        'overdueAmount',
      )
      .setParameter('confirmed', PaymentStatus.CONFIRMED)
      .getRawOne()

    const totalPlanned = parseFloat(raw?.totalPlanned) || 0
    const totalReceived = parseFloat(raw?.totalReceived) || 0
    const overdueAmount = parseFloat(raw?.overdueAmount) || 0

    return {
      totalPlanned,
      totalReceived,
      overdueAmount,
      overdueRate: totalPlanned > 0 ? Math.round((overdueAmount / totalPlanned) * 10000) / 100 : 0,
      collectionRate:
        totalPlanned > 0 ? Math.round((totalReceived / totalPlanned) * 10000) / 100 : 0,
    }
  }

  // ─── Overdue Status Refresh (can be called by a cron job) ─────────────

  async refreshOverdueStatus(): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overduePayments = await this.paymentRepository
      .createQueryBuilder('p')
      .andWhere('p.status = :status', { status: PaymentStatus.PLANNED })
      .andWhere('p.plannedDate < :today', { today })
      .getMany()

    let updated = 0
    for (const payment of overduePayments) {
      const plannedDate = new Date(payment.plannedDate!)
      const diffMs = today.getTime() - plannedDate.getTime()
      const overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (!payment.isOverdue || payment.overdueDays !== overdueDays) {
        payment.isOverdue = true
        payment.overdueDays = overdueDays
        await this.paymentRepository.save(payment)
        updated++
      }
    }

    return updated
  }

  // ─── Cron: Check Overdue Payments ─────────────────────────────────────

  @Cron('0 8 * * *')
  async checkOverduePayments(): Promise<void> {
    try {
      const updatedCount = await this.refreshOverdueStatus()
      this.logger.log(`Refreshed overdue status for ${updatedCount} payments`)

      // Notify owners of newly overdue payments
      const overduePayments = await this.getOverduePayments()
      for (const payment of overduePayments) {
        if (payment.overdueDays === 1) {
          // Only notify on first day of overdue
          this.notificationService.notifyUser(payment.ownerId, {
            type: 'system' as never,
            actorId: 0,
            actorName: '系统',
            resource: 'payment',
            resourceId: payment.id,
            message: `回款「${payment.paymentNo}」已逾期，请及时跟进`,
          })
        }
      }
    } catch (err) {
      this.logger.error('Failed to check overdue payments', err)
    }
  }
}
