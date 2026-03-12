import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Contract } from './entities/contract.entity'
import { ContractStatus } from '@crm/shared'
import { CreateContractDto } from './dto/create-contract.dto'
import { UpdateContractDto } from './dto/update-contract.dto'
import { QueryContractDto } from './dto/query-contract.dto'

@Injectable()
export class ContractService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
  ) {}

  // ─── Contract Number Generation ───────────────────────────────────────

  private async generateContractNo(): Promise<string> {
    const today = new Date()
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `CON-${yyyymmdd}-`

    // Find the latest contract with today's date prefix
    const latest = await this.contractRepository
      .createQueryBuilder('c')
      .where('c.contract_no LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('c.contract_no', 'DESC')
      .getOne()

    let seq = 1
    if (latest) {
      const parts = latest.contractNo.split('-')
      const lastSeq = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1
      }
    }

    return `${prefix}${String(seq).padStart(4, '0')}`
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────

  async create(dto: CreateContractDto, createdBy: number): Promise<Contract> {
    const contractNo = await this.generateContractNo()
    const entity = this.contractRepository.create({
      ...dto,
      contractNo,
      currency: dto.currency ?? 'CNY',
      renewalReminderDays: dto.renewalReminderDays ?? 30,
      paidAmount: 0,
      createdBy,
    })
    return this.contractRepository.save(entity)
  }

  async findAll(
    query: QueryContractDto,
  ): Promise<{ list: Contract[]; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 20, keyword, status, contractType, customerId, ownerId } = query
    const qb = this.contractRepository
      .createQueryBuilder('c')
      .where('c.deleted = :deleted', { deleted: false })

    if (keyword) {
      qb.andWhere('(c.contract_no LIKE :kw OR c.title LIKE :kw)', { kw: `%${keyword}%` })
    }
    if (status) {
      qb.andWhere('c.status = :status', { status })
    }
    if (contractType) {
      qb.andWhere('c.contract_type = :contractType', { contractType })
    }
    if (customerId) {
      qb.andWhere('c.customer_id = :customerId', { customerId })
    }
    if (ownerId) {
      qb.andWhere('c.owner_id = :ownerId', { ownerId })
    }

    qb.orderBy('c.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<Contract> {
    const contract = await this.contractRepository.findOne({ where: { id, deleted: false } })
    if (!contract) throw new NotFoundException(`Contract ${id} not found`)
    return contract
  }

  async update(id: number, dto: UpdateContractDto): Promise<Contract> {
    const contract = await this.findOne(id)
    Object.assign(contract, dto)
    return this.contractRepository.save(contract)
  }

  async remove(id: number): Promise<void> {
    const contract = await this.findOne(id)
    contract.deleted = true
    await this.contractRepository.save(contract)
  }

  // ─── Sign ──────────────────────────────────────────────────────────────

  async confirmSign(id: number, signFileUrl?: string): Promise<Contract> {
    const contract = await this.findOne(id)
    contract.status = ContractStatus.SIGNED
    contract.signDate = new Date().toISOString().slice(0, 10)
    if (signFileUrl) {
      contract.signFileUrl = signFileUrl
    }
    return this.contractRepository.save(contract)
  }

  // ─── Expiring Contracts ────────────────────────────────────────────────

  async getExpiringContracts(days: number): Promise<Contract[]> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    const futureDateStr = futureDate.toISOString().slice(0, 10)

    return this.contractRepository
      .createQueryBuilder('c')
      .where('c.deleted = :deleted', { deleted: false })
      .andWhere('c.status IN (:...activeStatuses)', {
        activeStatuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING],
      })
      .andWhere('c.end_date <= :futureDate', { futureDate: futureDateStr })
      .orderBy('c.end_date', 'ASC')
      .getMany()
  }
}
