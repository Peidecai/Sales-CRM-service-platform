import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Quotation } from './entities/quotation.entity'
import { QuotationItem } from './entities/quotation-item.entity'
import { CreateQuotationDto } from './dto/create-quotation.dto'
import { UpdateQuotationDto } from './dto/update-quotation.dto'
import { QueryQuotationDto } from './dto/query-quotation.dto'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

@Injectable()
export class QuotationService {
  constructor(
    @InjectRepository(Quotation) private readonly quotationRepo: Repository<Quotation>,
    @InjectRepository(QuotationItem) private readonly itemRepo: Repository<QuotationItem>,
  ) {}

  private generateNo(): string {
    const d = new Date()
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    return `QUO-${date}-${rand}`
  }

  async create(dto: CreateQuotationDto, user: AuthUser) {
    const { items: itemDtos, ...quotationData } = dto

    // Calculate amounts
    let subtotal = 0
    const items = itemDtos.map((item) => {
      const lineAmount = item.quantity * item.unitPrice * (1 - (item.discountRate || 0) / 100)
      subtotal += lineAmount
      return this.itemRepo.create({ ...item, lineAmount })
    })

    const discountAmount =
      dto.discountType === 'PERCENT'
        ? (subtotal * (dto.discountValue || 0)) / 100
        : dto.discountValue || 0
    const afterDiscount = subtotal - discountAmount
    const taxAmount = (afterDiscount * (dto.taxRate || 0)) / 100
    const totalAmount = afterDiscount + taxAmount

    const quotation = this.quotationRepo.create({
      ...quotationData,
      quotationNo: this.generateNo(),
      ownerId: user.id,
      createdBy: user.id,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
    })

    const saved = await this.quotationRepo.save(quotation)

    // Save items
    for (const item of items) {
      item.quotationId = saved.id
    }
    await this.itemRepo.save(items)

    return this.findOne(saved.id, user)
  }

  async findAll(query: QueryQuotationDto, _user: AuthUser) {
    const { page = 1, pageSize = 20, keyword, status, opportunityId, customerId } = query
    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (opportunityId) where.opportunityId = opportunityId
    if (customerId) where.customerId = customerId

    const qb = this.quotationRepo.createQueryBuilder('q')

    if (status) qb.andWhere('q.status = :status', { status })
    if (opportunityId) qb.andWhere('q.opportunityId = :opportunityId', { opportunityId })
    if (customerId) qb.andWhere('q.customerId = :customerId', { customerId })
    if (keyword) {
      qb.andWhere('(q.title LIKE :kw OR q.quotationNo LIKE :kw)', { kw: `%${keyword}%` })
    }

    qb.orderBy('q.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number, _user: AuthUser) {
    const quotation = await this.quotationRepo.findOne({
      where: { id },
      relations: ['items'],
    })
    if (!quotation) throw new NotFoundException(`报价单 #${id} 不存在`)
    return quotation
  }

  async update(id: number, dto: UpdateQuotationDto, user: AuthUser) {
    const quotation = await this.findOne(id, user)
    const { items: itemDtos, ...quotationData } = dto

    Object.assign(quotation, quotationData)

    if (itemDtos) {
      // Remove old items and recreate
      await this.itemRepo.delete({ quotationId: id })

      let subtotal = 0
      const items = itemDtos.map((item) => {
        const lineAmount = item.quantity * item.unitPrice * (1 - (item.discountRate || 0) / 100)
        subtotal += lineAmount
        return this.itemRepo.create({ ...item, lineAmount, quotationId: id })
      })

      quotation.subtotal = subtotal
      const discountAmount =
        dto.discountType === 'PERCENT'
          ? (subtotal * (dto.discountValue || 0)) / 100
          : dto.discountValue || 0
      quotation.discountAmount = discountAmount
      const afterDiscount = subtotal - discountAmount
      quotation.taxAmount = (afterDiscount * (dto.taxRate || quotation.taxRate || 0)) / 100
      quotation.totalAmount = afterDiscount + quotation.taxAmount

      await this.itemRepo.save(items)
    }

    return this.quotationRepo.save(quotation)
  }

  async remove(id: number) {
    const quotation = await this.quotationRepo.findOne({ where: { id } })
    if (!quotation) throw new NotFoundException(`报价单 #${id} 不存在`)
    await this.quotationRepo.softRemove(quotation)
  }
}
