import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Contact } from './contact.entity'
import { Customer } from '../customer/customer.entity'
import { CreateContactDto } from './dto/create-contact.dto'
import { UpdateContactDto } from './dto/update-contact.dto'
import { QueryContactDto } from './dto/query-contact.dto'

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findByCustomer(
    customerId: number,
    query: QueryContactDto,
  ): Promise<{ list: Contact[]; total: number }> {
    const { page = 1, pageSize = 20, keyword } = query

    const qb = this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.customer_id = :customerId', { customerId })

    if (keyword) {
      qb.andWhere('(contact.name LIKE :kw OR contact.mobile LIKE :kw)', { kw: `%${keyword}%` })
    }

    qb.orderBy('contact.isPrimary', 'DESC')
      .addOrderBy('contact.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }

  async create(
    customerId: number,
    dto: CreateContactDto,
  ): Promise<{
    contact: Contact
    duplicateWarnings: Array<{ id: number; name: string; mobile: string; email: string }>
  }> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    })
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`)
    }

    const duplicates = await this.checkDuplicate(dto.mobile, dto.email)

    const contact = this.contactRepository.create({ ...dto, customerId })
    const saved = await this.contactRepository.save(contact)

    return {
      contact: saved,
      duplicateWarnings: duplicates.map((d) => ({
        id: d.id,
        name: d.name,
        mobile: d.mobile,
        email: d.email,
      })),
    }
  }

  async update(id: number, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: { id },
    })
    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`)
    }

    Object.assign(contact, dto)
    return this.contactRepository.save(contact)
  }

  async remove(id: number): Promise<void> {
    const contact = await this.contactRepository.findOne({
      where: { id },
    })
    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`)
    }

    await this.contactRepository.softRemove(contact)
  }

  async checkDuplicate(mobile?: string, email?: string): Promise<Contact[]> {
    if (!mobile && !email) return []

    const qb = this.contactRepository.createQueryBuilder('contact')

    const conditions: string[] = []
    const params: Record<string, string> = {}

    if (mobile) {
      conditions.push('contact.mobile = :mobile')
      params.mobile = mobile
    }
    if (email) {
      conditions.push('contact.email = :email')
      params.email = email
    }

    qb.andWhere(`(${conditions.join(' OR ')})`, params)
    return qb.getMany()
  }

  async setPrimary(contactId: number): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId },
    })
    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`)
    }

    const queryRunner = this.contactRepository.manager.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // Reset all contacts for this customer
      await queryRunner.manager.update(
        Contact,
        { customerId: contact.customerId },
        { isPrimary: false },
      )
      // Set the target contact as primary
      contact.isPrimary = true
      const saved = await queryRunner.manager.save(contact)
      await queryRunner.commitTransaction()
      return saved
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }
}
