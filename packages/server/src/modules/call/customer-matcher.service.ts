import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Customer } from '../customer/customer.entity'
import { Contact } from '../contact/contact.entity'

export interface MatchResult {
  customer?: Customer
  contact?: Contact
  source: 'customer' | 'contact' | 'history' | null
}

/**
 * 号码归一化：去除空格/横线，国内 11 位手机号统一为 1 开头。
 */
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '').replace(/^\+86/, '')
  if (/^1\d{10}$/.test(cleaned)) return cleaned
  if (/^0\d{2,3}\d{7,8}$/.test(cleaned)) return cleaned // 固话
  return cleaned
}

@Injectable()
export class CustomerMatcherService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  async matchByPhone(phone: string): Promise<MatchResult | null> {
    const normalized = normalizePhone(phone)
    if (!normalized) return null

    const customer = await this.customerRepository.findOne({
      where: { phone: normalized, deleted: false },
    })
    if (customer) {
      return { customer, source: 'customer' }
    }

    const contact = await this.contactRepository
      .createQueryBuilder('c')
      .innerJoin('c.customer', 'cust')
      .where('cust.deleted = :del', { del: false })
      .andWhere('(c.mobile = :phone OR c.landline = :phone)', { phone: normalized })
      .select(['c.id', 'c.customerId', 'c.name', 'c.mobile', 'c.landline'])
      .getOne()

    if (contact) {
      const cust = await this.customerRepository.findOne({
        where: { id: contact.customerId, deleted: false },
      })
      if (cust) return { customer: cust, contact, source: 'contact' }
    }

    return null
  }
}
