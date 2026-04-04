import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder } from 'typeorm'
import * as ExcelJS from 'exceljs'
import { Customer } from '../customer.entity'
import { UserRole } from '@crm/shared'
import type { AuthUser } from '../../../common/decorators/current-user.decorator'

@Injectable()
export class CustomerExportService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  /**
   * Export customers as Excel (.xlsx) buffer.
   */
  async exportExcel(user: AuthUser): Promise<Buffer> {
    const qb = this.customerRepository.createQueryBuilder('customer')

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
   * Export all customers as CSV string (legacy).
   */
  async exportCsv(user: AuthUser): Promise<string> {
    const qb = this.customerRepository.createQueryBuilder('customer')

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

  /** Apply data permission: SALES users can only see their own records */
  private applyDataPermission(qb: SelectQueryBuilder<Customer>, user: AuthUser): void {
    if (user.role === UserRole.SALES) {
      qb.andWhere('customer.assignedUserId = :currentUserId', { currentUserId: user.id })
    }
  }

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }
}
