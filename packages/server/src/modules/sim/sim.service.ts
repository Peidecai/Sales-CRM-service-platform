import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SimPreference } from './entities/sim-preference.entity'
import { CustomerSimBinding } from './entities/customer-sim-binding.entity'
import { CallRecord } from '../call-record/call-record.entity'
import { UpdateSimPreferenceDto, SetCustomerSimBindingDto, SimUsageQueryDto } from './dto/sim.dto'

@Injectable()
export class SimService {
  constructor(
    @InjectRepository(SimPreference) private readonly prefRepo: Repository<SimPreference>,
    @InjectRepository(CustomerSimBinding)
    private readonly bindingRepo: Repository<CustomerSimBinding>,
    @InjectRepository(CallRecord) private readonly callRecordRepo: Repository<CallRecord>,
  ) {}

  async getPreference(userId: number): Promise<SimPreference | null> {
    return this.prefRepo.findOne({ where: { userId } })
  }

  async updatePreference(userId: number, dto: UpdateSimPreferenceDto): Promise<SimPreference> {
    let pref = await this.prefRepo.findOne({ where: { userId } })
    if (!pref) {
      pref = this.prefRepo.create({ userId, ...dto, lastDetectedAt: new Date() })
    } else {
      Object.assign(pref, dto, { lastDetectedAt: new Date() })
    }
    return this.prefRepo.save(pref)
  }

  async getCustomerBinding(userId: number, customerId: number): Promise<CustomerSimBinding | null> {
    return this.bindingRepo.findOne({ where: { userId, customerId } })
  }

  async setCustomerBinding(
    userId: number,
    dto: SetCustomerSimBindingDto,
  ): Promise<CustomerSimBinding> {
    let binding = await this.bindingRepo.findOne({ where: { userId, customerId: dto.customerId } })
    if (!binding) {
      binding = this.bindingRepo.create({
        userId,
        customerId: dto.customerId,
        simSlot: dto.simSlot,
        reason: dto.reason ?? null,
      })
    } else {
      binding.simSlot = dto.simSlot
      binding.reason = dto.reason ?? binding.reason
    }
    return this.bindingRepo.save(binding)
  }

  async removeCustomerBinding(userId: number, customerId: number): Promise<void> {
    const binding = await this.bindingRepo.findOne({ where: { userId, customerId } })
    if (!binding) throw new NotFoundException('绑定不存在')
    await this.bindingRepo.softRemove(binding)
  }

  async resolveSimSlot(
    userId: number,
    customerId?: number,
  ): Promise<{ slot: number; source: string }> {
    // 1. Customer binding
    if (customerId) {
      const binding = await this.bindingRepo.findOne({ where: { userId, customerId } })
      if (binding) return { slot: binding.simSlot, source: 'customer_binding' }
    }
    // 2. Default preference
    const pref = await this.prefRepo.findOne({ where: { userId } })
    if (pref) return { slot: pref.defaultSlot, source: 'default' }
    // 3. Fallback SIM1
    return { slot: 0, source: 'fallback' }
  }

  async getUsageStatistics(userId: number, query: SimUsageQueryDto) {
    const qb = this.callRecordRepo
      .createQueryBuilder('cr')
      .where('cr.userId = :uid', { uid: userId })
      .andWhere('cr.simSlot IS NOT NULL')

    if (query.startDate) qb.andWhere('cr.callAt >= :start', { start: query.startDate })
    if (query.endDate) qb.andWhere('cr.callAt <= :end', { end: query.endDate })

    const stats = await qb
      .select('cr.simSlot', 'simSlot')
      .addSelect('COUNT(*)', 'callCount')
      .addSelect('SUM(cr.duration)', 'totalDuration')
      .groupBy('cr.simSlot')
      .getRawMany()

    return stats.map((s) => ({
      simSlot: Number(s.simSlot),
      callCount: Number(s.callCount),
      totalDuration: Number(s.totalDuration ?? 0),
    }))
  }
}
