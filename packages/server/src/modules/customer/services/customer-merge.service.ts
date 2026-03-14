import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Customer } from '../customer.entity'
import { Contact } from '../../contact/contact.entity'
import { FollowUp } from '../../follow-up/follow-up.entity'
import { Opportunity } from '../../opportunity/opportunity.entity'

export interface MergePreview {
  primary: Customer
  secondary: Customer
  mergeStats: {
    contactCount: number
    followUpCount: number
    opportunityCount: number
  }
}

@Injectable()
export class CustomerMergeService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(FollowUp)
    private readonly followUpRepo: Repository<FollowUp>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
  ) {}

  async previewMerge(primaryId: number, secondaryId: number): Promise<MergePreview> {
    const primary = await this.customerRepo.findOne({ where: { id: primaryId } })
    if (!primary) throw new NotFoundException(`Primary customer ${primaryId} not found`)

    const secondary = await this.customerRepo.findOne({
      where: { id: secondaryId },
    })
    if (!secondary) throw new NotFoundException(`Secondary customer ${secondaryId} not found`)

    const contactCount = await this.contactRepo.count({
      where: { customerId: secondaryId },
    })
    const followUpCount = await this.followUpRepo.count({
      where: { customerId: secondaryId },
    })
    const opportunityCount = await this.opportunityRepo.count({
      where: { customerId: secondaryId },
    })

    return {
      primary,
      secondary,
      mergeStats: { contactCount, followUpCount, opportunityCount },
    }
  }

  async executeMerge(primaryId: number, secondaryId: number): Promise<Customer> {
    const primary = await this.customerRepo.findOne({ where: { id: primaryId } })
    if (!primary) throw new NotFoundException(`Primary customer ${primaryId} not found`)

    const secondary = await this.customerRepo.findOne({
      where: { id: secondaryId },
    })
    if (!secondary) throw new NotFoundException(`Secondary customer ${secondaryId} not found`)

    const queryRunner = this.customerRepo.manager.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // 1. Merge contacts
      await queryRunner.query(
        'UPDATE contacts SET customer_id = ? WHERE customer_id = ? AND deleted_at IS NULL',
        [primaryId, secondaryId],
      )

      // 2. Merge follow-ups
      await queryRunner.query(
        'UPDATE follow_ups SET customer_id = ? WHERE customer_id = ? AND deleted_at IS NULL',
        [primaryId, secondaryId],
      )

      // 3. Merge opportunities
      await queryRunner.query(
        'UPDATE opportunities SET customer_id = ? WHERE customer_id = ? AND deleted_at IS NULL',
        [primaryId, secondaryId],
      )

      // 4. Soft-delete secondary customer
      await queryRunner.manager.softRemove(secondary)

      await queryRunner.commitTransaction()
      return primary
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }
}
