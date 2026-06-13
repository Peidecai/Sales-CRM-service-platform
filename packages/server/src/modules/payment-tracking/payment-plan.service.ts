import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PaymentPlan } from './entities/payment-plan.entity'
import { PaymentPlanItem } from './entities/payment-plan-item.entity'
import { CreatePaymentPlanDto, ConfirmPaymentDto } from './dto/payment-tracking.dto'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'

@Injectable()
export class PaymentPlanService {
  constructor(
    @InjectRepository(PaymentPlan)
    private readonly planRepo: Repository<PaymentPlan>,
    @InjectRepository(PaymentPlanItem)
    private readonly itemRepo: Repository<PaymentPlanItem>,
  ) {}

  async create(dto: CreatePaymentPlanDto, user: AuthUser): Promise<PaymentPlan> {
    const plan = this.planRepo.create({
      contractId: dto.contractId,
      planName: dto.planName,
      totalInstallments: dto.totalInstallments,
      totalAmount: dto.totalAmount,
      splitMethod: dto.splitMethod,
      salesUserId: user.id,
    })
    const saved = await this.planRepo.save(plan)

    if (dto.splitMethod === 'equal') {
      const perAmount = Math.floor((dto.totalAmount / dto.totalInstallments) * 100) / 100
      const remainder =
        Math.round((dto.totalAmount - perAmount * dto.totalInstallments) * 100) / 100
      const today = new Date()
      for (let i = 1; i <= dto.totalInstallments; i++) {
        const dueDate = new Date(today)
        dueDate.setMonth(dueDate.getMonth() + i)
        const amount = i === dto.totalInstallments ? perAmount + remainder : perAmount
        await this.itemRepo.save(
          this.itemRepo.create({
            planId: saved.id,
            installmentNo: i,
            amount,
            dueDate: dueDate.toISOString().split('T')[0],
            status: 'pending',
          }),
        )
      }
    } else if (dto.items) {
      for (let i = 0; i < dto.items.length; i++) {
        await this.itemRepo.save(
          this.itemRepo.create({
            planId: saved.id,
            installmentNo: i + 1,
            amount: dto.items[i].amount,
            dueDate: dto.items[i].dueDate,
            status: 'pending',
          }),
        )
      }
    }

    return saved
  }

  async findAll(page: number, pageSize: number, user: AuthUser) {
    const qb = this.planRepo.createQueryBuilder('pp')
    if (user.role === UserRole.SALES) {
      qb.andWhere('pp.salesUserId = :uid', { uid: user.id })
    }
    qb.orderBy('pp.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number, user: AuthUser) {
    const plan = await this.planRepo.findOne({ where: { id } })
    if (!plan) throw new NotFoundException(`回款计划 #${id} 不存在`)
    if (user.role === UserRole.SALES && plan.salesUserId !== user.id) {
      throw new ForbiddenException('无权访问')
    }
    const items = await this.itemRepo.find({
      where: { planId: id },
      order: { installmentNo: 'ASC' },
    })
    return { ...plan, items }
  }

  async confirmPayment(
    itemId: number,
    dto: ConfirmPaymentDto,
    user: AuthUser,
  ): Promise<PaymentPlanItem> {
    const item = await this.itemRepo.findOne({ where: { id: itemId } })
    if (!item) throw new NotFoundException(`行项 #${itemId} 不存在`)
    if (user.role === UserRole.SALES) throw new ForbiddenException('仅 Manager/Admin 可确认收款')

    // Atomic update to avoid race condition
    await this.itemRepo
      .createQueryBuilder()
      .update(PaymentPlanItem)
      .set({
        paidAmount: () => `paid_amount + ${Number(dto.paidAmount)}`,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        ...(dto.remark ? { remark: dto.remark } : {}),
      })
      .where('id = :id', { id: itemId })
      .execute()

    const updated = await this.itemRepo.findOne({ where: { id: itemId } })
    if (!updated) throw new NotFoundException(`行项 #${itemId} 不存在`)
    updated.status = Number(updated.paidAmount) >= Number(updated.amount) ? 'paid' : 'partial'
    return this.itemRepo.save(updated)
  }

  async markBadDebt(itemId: number, user: AuthUser): Promise<PaymentPlanItem> {
    if (user.role === UserRole.SALES) throw new ForbiddenException('仅 Manager/Admin 可标记坏账')
    const item = await this.itemRepo.findOne({ where: { id: itemId } })
    if (!item) throw new NotFoundException(`行项 #${itemId} 不存在`)
    item.status = 'bad_debt'
    return this.itemRepo.save(item)
  }

  async getOverdueItems(page: number, pageSize: number) {
    const [list, total] = await this.itemRepo.findAndCount({
      where: { status: 'overdue' },
      order: { dueDate: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    return { list, total, page, pageSize }
  }
}
