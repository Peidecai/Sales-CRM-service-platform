import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import ExcelJS from 'exceljs'
import { Customer } from '../customer.entity'
import { CustomerStatus, CustomerSource } from '@crm/shared'
import { RedisService } from '../../../common/redis'
import { CustomerNumberService } from './customer-number.service'

@Injectable()
export class CustomerImportService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly redisService: RedisService,
    private readonly customerNumberService: CustomerNumberService,
  ) {}

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

    return { imported: toCreate.length, errors }
  }
}
