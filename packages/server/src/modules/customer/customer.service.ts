import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder } from 'typeorm'
import ExcelJS from 'exceljs'
import { Customer } from './customer.entity'
import { User } from '../user/user.entity'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'
import { QueryCustomerDto } from './dto/query-customer.dto'
import { AllocateCustomerDto } from './dto/allocate-customer.dto'
import { RedisService } from '../../common/redis'
import { CACHE_KEYS, CACHE_TTL } from '../../common/redis'
import { CustomerStatus, CustomerSource, UserRole } from '@crm/shared'
import { CustomFieldService } from '../custom-field/custom-field.service'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly customFieldService: CustomFieldService,
  ) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    if (dto.customFields) {
      await this.customFieldService.validateCustomFields(dto.customFields)
    }
    const customer = this.customerRepository.create(dto)
    customer.customerNo = await this.generateCustomerNo()
    const saved = await this.customerRepository.save(customer)
    await this.invalidateListCache()
    return saved
  }

  async findAll(
    query: QueryCustomerDto,
    user: AuthUser,
  ): Promise<{ list: Customer[]; total: number }> {
    const { page = 1, pageSize = 20, keyword, status, assignedUserId } = query

    // SALES users can only see their own customers
    const effectiveAssignedUserId = user.role === UserRole.SALES ? user.id : assignedUserId

    // Build cache key from query params (include userId for SALES role isolation)
    const cacheKey = `${CACHE_KEYS.CUSTOMER_LIST}:${JSON.stringify({ page, pageSize, keyword, status, assignedUserId: effectiveAssignedUserId, _role: user.role, _uid: user.id })}`
    const cached = await this.redisService.get(cacheKey)
    if (cached) {
      return JSON.parse(cached) as { list: Customer[]; total: number }
    }

    const qb = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.deleted = :deleted', { deleted: false })

    this.applyDataPermission(qb, user)

    if (keyword) {
      qb.andWhere(
        '(customer.name LIKE :kw OR customer.company LIKE :kw OR customer.phone LIKE :kw OR customer.email LIKE :kw)',
        { kw: `%${keyword}%` },
      )
    }

    if (status) {
      qb.andWhere('customer.status = :status', { status })
    }

    if (assignedUserId && user.role !== UserRole.SALES) {
      qb.andWhere('customer.assignedUserId = :assignedUserId', { assignedUserId })
    }

    qb.orderBy('customer.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    const result = { list, total }

    await this.redisService.set(cacheKey, JSON.stringify(result), CACHE_TTL.CUSTOMER_LIST)
    return result
  }

  async findOne(id: number, user?: AuthUser): Promise<Customer> {
    const cacheKey = `${CACHE_KEYS.CUSTOMER_DETAIL}:${id}`
    const cached = await this.redisService.get(cacheKey)
    if (cached) {
      const customer = JSON.parse(cached) as Customer
      this.checkOwnership(customer, user)
      return customer
    }

    const customer = await this.customerRepository.findOne({
      where: { id, deleted: false },
    })

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`)
    }

    this.checkOwnership(customer, user)

    await this.redisService.set(cacheKey, JSON.stringify(customer), CACHE_TTL.CUSTOMER_DETAIL)
    return customer
  }

  async update(id: number, dto: UpdateCustomerDto, user?: AuthUser): Promise<Customer> {
    const customer = await this.findOne(id, user)

    // Validate custom fields if provided
    if (dto.customFields) {
      await this.customFieldService.validateCustomFields(dto.customFields)
    }

    // Validate status transition if status is being changed
    if (dto.status && dto.status !== customer.status) {
      if (!this.validateStatusTransition(customer.status, dto.status)) {
        throw new BadRequestException('状态转换不允许')
      }
    }

    Object.assign(customer, dto)
    const saved = await this.customerRepository.save(customer)
    await this.invalidateListCache()
    await this.invalidateDetailCache(id)
    return saved
  }

  async remove(id: number): Promise<void> {
    const customer = await this.findOne(id)
    customer.deleted = true
    await this.customerRepository.save(customer)
    await this.invalidateListCache()
    await this.invalidateDetailCache(id)
  }

  async allocate(id: number, dto: AllocateCustomerDto): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id, deleted: false } })
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`)
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: dto.assignedUserId, deleted: false },
    })
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${dto.assignedUserId} not found`)
    }
    if (!targetUser.isActive) {
      throw new BadRequestException(`User with ID ${dto.assignedUserId} is not active`)
    }

    customer.assignedUserId = dto.assignedUserId
    const saved = await this.customerRepository.save(customer)
    await this.invalidateListCache()
    await this.invalidateDetailCache(id)
    return saved
  }

  /** Generate unique customer number: CUS-YYYYMMDD-XXXX */
  private async generateCustomerNo(): Promise<string> {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const seqKey = `seq:customer_no:${dateStr}`
    const seq = await this.redisService.incr(seqKey)
    if (seq === 1) {
      await this.redisService.expire(seqKey, 172800) // 48h TTL
    }
    return `CUS-${dateStr}-${String(seq).padStart(4, '0')}`
  }

  /** Invalidate all customer list caches */
  private async invalidateListCache(): Promise<void> {
    await this.redisService.delByPattern(`${CACHE_KEYS.CUSTOMER_LIST}:*`)
  }

  /** Invalidate a single customer detail cache */
  private async invalidateDetailCache(id: number): Promise<void> {
    await this.redisService.del(`${CACHE_KEYS.CUSTOMER_DETAIL}:${id}`)
  }

  /**
   * Export customers as Excel (.xlsx) buffer.
   */
  async exportExcel(user: AuthUser): Promise<Buffer> {
    const qb = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.deleted = :deleted', { deleted: false })

    this.applyDataPermission(qb, user)
    qb.orderBy('customer.updatedAt', 'DESC').take(5000)

    const customers = await qb.getMany()

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('客户列表')

    sheet.columns = [
      { header: '客户编号', key: 'customerNo', width: 20 },
      { header: '客户名称', key: 'name', width: 20 },
      { header: '公司', key: 'company', width: 25 },
      { header: '手机', key: 'phone', width: 15 },
      { header: '邮箱', key: 'email', width: 25 },
      { header: '状态', key: 'status', width: 12 },
      { header: '行业', key: 'industry', width: 15 },
      { header: '来源', key: 'source', width: 12 },
      { header: '区域', key: 'region', width: 15 },
      { header: '客户等级', key: 'level', width: 10 },
      { header: '备注', key: 'notes', width: 30 },
    ]

    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }

    customers.forEach((c) => sheet.addRow(c))

    return Buffer.from(await workbook.xlsx.writeBuffer()) as Buffer
  }

  /**
   * Generate import template as Excel buffer.
   */
  async generateImportTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('客户导入模板')

    sheet.columns = [
      { header: '客户名称(必填)', key: 'name', width: 20 },
      { header: '公司', key: 'company', width: 25 },
      { header: '手机号', key: 'phone', width: 15 },
      { header: '邮箱', key: 'email', width: 25 },
      {
        header: '状态(lead/potential/intention/opportunity/deal/maintain)',
        key: 'status',
        width: 45,
      },
      { header: '行业', key: 'industry', width: 15 },
      {
        header: '来源(website/referral/cold_call/exhibition/ad/import/other)',
        key: 'source',
        width: 45,
      },
      { header: '区域', key: 'region', width: 15 },
      { header: '备注', key: 'notes', width: 30 },
    ]

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF409EFF' },
    }

    sheet.addRow({
      name: '示例客户',
      company: '示例公司',
      phone: '13800138000',
      status: 'potential',
    })

    return Buffer.from(await workbook.xlsx.writeBuffer()) as Buffer
  }

  /**
   * Parse Excel file headers for column mapping.
   */
  async parseExcelHeaders(buffer: Buffer): Promise<string[]> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    const sheet = workbook.getWorksheet(1)
    if (!sheet) throw new BadRequestException('Excel 文件无有效工作表')
    const headerRow = sheet.getRow(1)
    const values = headerRow.values as (string | undefined)[]
    return values.slice(1).map((v) => String(v ?? ''))
  }

  /**
   * Get system field definitions for import mapping.
   */
  getSystemFields(): Array<{ key: string; label: string; required: boolean }> {
    return [
      { key: 'name', label: '客户名称', required: true },
      { key: 'company', label: '公司', required: false },
      { key: 'phone', label: '手机号', required: false },
      { key: 'email', label: '邮箱', required: false },
      { key: 'status', label: '状态', required: false },
      { key: 'industry', label: '行业', required: false },
      { key: 'source', label: '来源', required: false },
      { key: 'region', label: '区域', required: false },
      { key: 'notes', label: '备注', required: false },
      { key: 'unifiedCreditCode', label: '统一社会信用代码', required: false },
      { key: 'legalPerson', label: '法人代表', required: false },
      { key: 'address', label: '详细地址', required: false },
      { key: 'website', label: '公司网站', required: false },
    ]
  }

  /**
   * Export all non-deleted customers as CSV string (legacy).
   */
  async exportCsv(user: AuthUser): Promise<string> {
    const qb = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.deleted = :deleted', { deleted: false })

    this.applyDataPermission(qb, user)
    qb.orderBy('customer.updatedAt', 'DESC')

    const customers = await qb.getMany()

    const header = '姓名,公司,手机,邮箱,状态,行业,来源,备注'
    const rows = customers.map((c) => {
      return [
        this.escapeCsvField(c.name),
        this.escapeCsvField(c.company ?? ''),
        this.escapeCsvField(c.phone ?? ''),
        this.escapeCsvField(c.email ?? ''),
        this.escapeCsvField(c.status ?? ''),
        this.escapeCsvField(c.industry ?? ''),
        this.escapeCsvField(c.source ?? ''),
        this.escapeCsvField(c.notes ?? ''),
      ].join(',')
    })

    // Add BOM for Excel UTF-8 compatibility
    return '\uFEFF' + [header, ...rows].join('\n')
  }

  /**
   * Import customers from parsed CSV rows.
   * Returns count of successfully imported records.
   */
  async importFromCsvRows(
    rows: Array<Record<string, string>>,
    assignedUserId: number,
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = []
    const toCreate: Partial<Customer>[] = []
    const validStatuses = Object.values(CustomerStatus) as string[]

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const lineNum = i + 2 // +1 for header, +1 for 1-indexed

      const name = (row['姓名'] ?? row['name'] ?? '').trim()
      if (!name) {
        errors.push(`第${lineNum}行：姓名不能为空`)
        continue
      }

      let status = (row['状态'] ?? row['status'] ?? '').trim()
      if (status) {
        // Map Chinese status labels to enum values
        const statusLabelMap: Record<string, string> = {
          线索: CustomerStatus.LEAD,
          潜在客户: CustomerStatus.POTENTIAL,
          有意向: CustomerStatus.INTENTION,
          商机客户: CustomerStatus.OPPORTUNITY,
          成交客户: CustomerStatus.DEAL,
          维护期: CustomerStatus.MAINTAIN,
          无效客户: CustomerStatus.INVALID,
          已流失: CustomerStatus.LOST,
        }
        status = statusLabelMap[status] ?? status
        if (!validStatuses.includes(status)) {
          errors.push(`第${lineNum}行：无效的状态值 "${row['状态'] ?? row['status']}"`)
          continue
        }
      }

      toCreate.push({
        name,
        company: (row['公司'] ?? row['company'] ?? '').trim() || undefined,
        phone: (row['手机'] ?? row['phone'] ?? '').trim() || undefined,
        email: (row['邮箱'] ?? row['email'] ?? '').trim() || undefined,
        status: (status as CustomerStatus) || CustomerStatus.POTENTIAL,
        industry: (row['行业'] ?? row['industry'] ?? '').trim() || undefined,
        source: ((row['来源'] ?? row['source'] ?? '').trim() || undefined) as
          | CustomerSource
          | undefined,
        notes: (row['备注'] ?? row['notes'] ?? '').trim() || undefined,
        assignedUserId,
      })
    }

    if (toCreate.length === 0) {
      throw new BadRequestException('没有有效的客户数据可导入')
    }

    const entities = this.customerRepository.create(toCreate)
    await this.customerRepository.save(entities)
    await this.invalidateListCache()

    return { imported: toCreate.length, errors }
  }

  /** Status machine: ordered progression of customer states */
  private readonly STATUS_ORDER: CustomerStatus[] = [
    CustomerStatus.LEAD,
    CustomerStatus.POTENTIAL,
    CustomerStatus.INTENTION,
    CustomerStatus.OPPORTUNITY,
    CustomerStatus.DEAL,
    CustomerStatus.MAINTAIN,
  ]

  /** Validate if a status transition is allowed */
  validateStatusTransition(from: CustomerStatus, to: CustomerStatus): boolean {
    // invalid and lost can be entered from any state
    if (to === CustomerStatus.INVALID || to === CustomerStatus.LOST) return true
    // cannot transition back from invalid/lost to main flow
    if (from === CustomerStatus.INVALID || from === CustomerStatus.LOST) return false
    const fromIdx = this.STATUS_ORDER.indexOf(from)
    const toIdx = this.STATUS_ORDER.indexOf(to)
    // only allow forward by exactly one step
    return toIdx === fromIdx + 1
  }

  /** Extend customer protection period based on current status */
  async extendProtection(customerId: number): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, deleted: false },
    })
    if (!customer || customer.isInPool) return

    const protectDaysMap: Record<string, number> = {
      lead: 15,
      potential: 15,
      intention: 30,
      opportunity: 45,
      deal: 60,
      maintain: 60,
    }
    const days = protectDaysMap[customer.status] ?? 15

    const newProtectUntil = new Date()
    newProtectUntil.setDate(newProtectUntil.getDate() + days)

    if (!customer.protectUntil || newProtectUntil > customer.protectUntil) {
      customer.protectUntil = newProtectUntil
      await this.customerRepository.save(customer)
      await this.invalidateDetailCache(customerId)
    }
  }

  /** Apply data permission: SALES users can only see their own records */
  private applyDataPermission(qb: SelectQueryBuilder<Customer>, user: AuthUser): void {
    if (user.role === UserRole.SALES) {
      qb.andWhere('customer.assignedUserId = :currentUserId', { currentUserId: user.id })
    }
  }

  /** Check ownership for single record access */
  private checkOwnership(customer: Customer, user?: AuthUser): void {
    if (user && user.role === UserRole.SALES && customer.assignedUserId !== user.id) {
      throw new ForbiddenException('您无权访问此客户')
    }
  }

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }
}
