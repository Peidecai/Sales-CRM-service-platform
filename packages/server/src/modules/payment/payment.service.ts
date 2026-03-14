import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PaymentStatus } from '@crm/shared'
import type { PageResult } from '@crm/shared'
import { Payment } from './entities/payment.entity'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { UpdatePaymentDto } from './dto/update-payment.dto'
import { QueryPaymentDto } from './dto/query-payment.dto'
import { ConfirmPaymentDto } from './dto/confirm-payment.dto'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  // ─── Payment No Generator ─────────────────────────────────────────────

  private async generatePaymentNo(): Promise<string> {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')

    // Count today's payments to build a sequential suffix
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const todayCount = await this.paymentRepository
      .createQueryBuilder('p')
      .where('p.created_at >= :start', { start: startOfDay })
      .andWhere('p.created_at < :end', { end: endOfDay })
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

  async findAll(query: QueryPaymentDto): Promise<PageResult<Payment>> {
    const { page = 1, pageSize = 20, contractId, customerId, ownerId, status, isOverdue } = query

    const qb = this.paymentRepository.createQueryBuilder('p')

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

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
    })
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`)
    }
    return payment
  }

  async update(id: number, dto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id)
    Object.assign(payment, dto)
    return this.paymentRepository.save(payment)
  }

  async remove(id: number): Promise<void> {
    const payment = await this.findOne(id)
    await this.paymentRepository.softRemove(payment)
  }

  // ─── Confirm Payment Arrival ──────────────────────────────────────────

  async confirmPayment(id: number, dto: ConfirmPaymentDto, user: AuthUser): Promise<Payment> {
    const payment = await this.findOne(id)

    payment.actualAmount = dto.actualAmount
    payment.actualDate = new Date(dto.actualDate)
    payment.paymentMethod = dto.paymentMethod
    payment.bankTransactionNo = dto.bankTransactionNo ?? payment.bankTransactionNo
    payment.status = PaymentStatus.CONFIRMED
    payment.confirmUserId = user.id
    payment.confirmedAt = new Date()

    return this.paymentRepository.save(payment)
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
}
