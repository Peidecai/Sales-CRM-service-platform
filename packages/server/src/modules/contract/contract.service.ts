import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Cron } from '@nestjs/schedule'
import { Contract } from './entities/contract.entity'
import { ContractStatus } from '@crm/shared'
import { CreateContractDto } from './dto/create-contract.dto'
import { UpdateContractDto } from './dto/update-contract.dto'
import { QueryContractDto } from './dto/query-contract.dto'
import { ContractTemplateService } from './contract-template.service'
import { NotificationService } from '../notification/notification.service'

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name)

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    private readonly templateService: ContractTemplateService,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── Contract Number Generation ───────────────────────────────────────

  private async generateContractNo(): Promise<string> {
    const today = new Date()
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `CON-${yyyymmdd}-`

    const latest = await this.contractRepository
      .createQueryBuilder('c')
      .where('c.contractNo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('c.contractNo', 'DESC')
      .setLock('pessimistic_write')
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
    const qb = this.contractRepository.createQueryBuilder('c')

    if (keyword) {
      qb.andWhere('(c.contractNo LIKE :kw OR c.title LIKE :kw)', { kw: `%${keyword}%` })
    }
    if (status) {
      qb.andWhere('c.status = :status', { status })
    }
    if (contractType) {
      qb.andWhere('c.contractType = :contractType', { contractType })
    }
    if (customerId) {
      qb.andWhere('c.customerId = :customerId', { customerId })
    }
    if (ownerId) {
      qb.andWhere('c.ownerId = :ownerId', { ownerId })
    }

    qb.orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<Contract> {
    const contract = await this.contractRepository.findOne({ where: { id } })
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
    await this.contractRepository.softRemove(contract)
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
      .andWhere('c.status IN (:...activeStatuses)', {
        activeStatuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING],
      })
      .andWhere('c.endDate <= :futureDate', { futureDate: futureDateStr })
      .orderBy('c.endDate', 'ASC')
      .getMany()
  }

  // ─── Create From Template ─────────────────────────────────────────────

  async createFromTemplate(
    templateId: number,
    variables: Record<string, string>,
    contractData: CreateContractDto,
    userId: number,
  ): Promise<Contract> {
    const template = await this.templateService.findOne(templateId)
    const renderedContent = this.templateService.renderTemplate(template.content, variables)

    const contractNo = await this.generateContractNo()
    const entity = this.contractRepository.create({
      ...contractData,
      contractNo,
      currency: contractData.currency ?? 'CNY',
      renewalReminderDays: contractData.renewalReminderDays ?? 30,
      paidAmount: 0,
      paymentTerms: renderedContent,
      createdBy: userId,
    })
    return this.contractRepository.save(entity)
  }

  // ─── Renew ─────────────────────────────────────────────────────────────

  async renew(
    contractId: number,
    newEndDate: string,
    newAmount: number,
    userId: number,
  ): Promise<Contract> {
    const original = await this.findOne(contractId)

    const allowedStatuses: ContractStatus[] = [
      ContractStatus.SIGNED,
      ContractStatus.EXECUTING,
      ContractStatus.COMPLETED,
    ]
    if (!allowedStatuses.includes(original.status)) {
      throw new BadRequestException(
        `合同状态 ${original.status} 不允许续签，仅 signed/executing/completed 可续签`,
      )
    }

    const contractNo = await this.generateContractNo()
    const newContract = this.contractRepository.create({
      contractNo,
      title: `${original.title} (续签)`,
      contractType: original.contractType,
      opportunityId: original.opportunityId,
      customerId: original.customerId,
      ownerId: original.ownerId,
      ourEntity: original.ourEntity,
      customerEntity: original.customerEntity,
      currency: original.currency,
      totalAmount: newAmount,
      paidAmount: 0,
      startDate: original.endDate,
      endDate: newEndDate,
      paymentTerms: original.paymentTerms,
      deliveryTerms: original.deliveryTerms,
      status: ContractStatus.DRAFT,
      renewalReminderDays: original.renewalReminderDays,
      parentContractId: original.id,
      createdBy: userId,
    })

    const saved = await this.contractRepository.save(newContract)

    // Update original contract status to RENEWED
    original.status = ContractStatus.RENEWED
    await this.contractRepository.save(original)

    return saved
  }

  // ─── Cron: Check Expiring Contracts ───────────────────────────────────

  @Cron('0 9 * * *')
  async checkExpiring(): Promise<void> {
    const thresholds = [30, 7, 1]

    for (const days of thresholds) {
      try {
        const contracts = await this.getExpiringContracts(days)
        for (const contract of contracts) {
          this.notificationService.notifyUser(contract.ownerId, {
            type: 'system' as never,
            actorId: 0,
            actorName: '系统',
            resource: 'contract',
            resourceId: contract.id,
            message: `合同「${contract.title}」将在 ${days} 天内到期，请及时处理`,
          })
        }
      } catch (err) {
        this.logger.error(`Failed to check expiring contracts (${days}d)`, err)
      }
    }
  }
}
