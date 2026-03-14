import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Customer } from '../customer/customer.entity'
import { Contact } from '../contact/contact.entity'
import { FollowUp } from '../follow-up/follow-up.entity'
import { CallRecord } from '../call-record/call-record.entity'

export interface PopupData {
  customer: Customer
  contact?: { id: number; name: string; mobile?: string; landline?: string }
  recentFollowUps: FollowUp[]
  lastCallSummary?: string
  todos: unknown[]
}

@Injectable()
export class PopupAggregateService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(FollowUp)
    private readonly followUpRepository: Repository<FollowUp>,
    @InjectRepository(CallRecord)
    private readonly callRecordRepository: Repository<CallRecord>,
  ) {}

  async getPopupData(customerId: number, contactId?: number): Promise<PopupData> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    })
    if (!customer) {
      throw new NotFoundException('Customer not found')
    }

    const [recentFollowUps, lastCall, contact] = await Promise.all([
      this.followUpRepository.find({
        where: { customerId },
        order: { createdAt: 'DESC' },
        take: 3,
      }),
      this.callRecordRepository.findOne({
        where: { customerId },
        order: { callAt: 'DESC' },
        select: ['aiSummary'],
      }),
      contactId
        ? this.contactRepository.findOne({
            where: { id: contactId, customerId },
            select: ['id', 'name', 'mobile', 'landline'],
          })
        : Promise.resolve(null),
    ])

    let contactDto: PopupData['contact']
    if (contact) {
      contactDto = {
        id: contact.id,
        name: contact.name,
        mobile: contact.mobile ?? undefined,
        landline: contact.landline ?? undefined,
      }
    }

    return {
      customer,
      contact: contactDto,
      recentFollowUps,
      lastCallSummary: lastCall?.aiSummary ?? undefined,
      todos: [],
    }
  }
}
