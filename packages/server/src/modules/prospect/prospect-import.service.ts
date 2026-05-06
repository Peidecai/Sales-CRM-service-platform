import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import * as ExcelJS from 'exceljs'
import { Prospect } from './prospect.entity'
import { Customer } from '../customer/customer.entity'
import { ProspectChannel, ProspectStatus, CustomerStatus, CustomerSource } from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

/** Max rows allowed per import */
const MAX_IMPORT_ROWS = 2000

@Injectable()
export class ProspectImportService {
  constructor(
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  /**
   * Generate prospect import Excel template.
   */
  async generateImportTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('线索导入模板')

    sheet.columns = [
      { header: '企业名称(必填)', key: 'companyName', width: 25 },
      { header: '行业', key: 'industry', width: 15 },
      { header: '省份', key: 'province', width: 12 },
      { header: '城市', key: 'city', width: 12 },
      { header: '联系电话', key: 'phone', width: 18 },
      { header: '邮箱', key: 'email', width: 25 },
      { header: '统一社会信用代码', key: 'unifiedCreditCode', width: 22 },
      { header: '注册资本', key: 'registeredCapital', width: 15 },
      { header: '法人代表', key: 'legalPerson', width: 15 },
      { header: '详细地址', key: 'address', width: 30 },
      { header: '公司网站', key: 'website', width: 25 },
      { header: '员工人数', key: 'employeeCount', width: 12 },
      { header: '经营范围', key: 'businessScope', width: 40 },
      { header: '备注', key: 'remark', width: 25 },
    ]

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF409EFF' },
    }

    sheet.addRow({
      companyName: '示例科技有限公司',
      industry: '信息技术',
      province: '广东',
      city: '深圳',
      phone: '0755-12345678',
      unifiedCreditCode: '91440300MA5XXXXX',
    })

    return Buffer.from(await workbook.xlsx.writeBuffer()) as Buffer
  }

  /**
   * Import Excel data as prospects.
   * Uses batch duplicate check (C1 fix) instead of per-row findOne.
   */
  async importAsProspect(
    buffer: Buffer,
    user: AuthUser,
  ): Promise<{ imported: number; errors: string[] }> {
    const rows = await this.parseExcel(buffer)
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`单次导入不能超过 ${MAX_IMPORT_ROWS} 条`)
    }

    const errors: string[] = []
    const toCreate: Partial<Prospect>[] = []

    // 先收集名称做批量查重，避免 Excel 大文件导入时逐行打数据库。
    const allNames: string[] = []
    for (const row of rows) {
      const name = (row['企业名称(必填)'] ?? row['企业名称'] ?? '').trim()
      if (name) allNames.push(name)
    }

    // Batch query existing prospects by companyName
    const existingSet = new Set<string>()
    if (allNames.length > 0) {
      const existing = await this.prospectRepo.find({
        where: { companyName: In(allNames) },
        select: ['companyName'],
      })
      for (const p of existing) {
        existingSet.add(p.companyName)
      }
    }

    // 同一文件内也要去重，防止本次导入制造重复线索。
    const seenInBatch = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const lineNum = i + 2

      const companyName = (row['企业名称(必填)'] ?? row['企业名称'] ?? '').trim()
      if (!companyName) {
        errors.push(`第${lineNum}行：企业名称不能为空`)
        continue
      }

      if (existingSet.has(companyName)) {
        errors.push(`第${lineNum}行：企业「${companyName}」已存在于线索池中`)
        continue
      }

      if (seenInBatch.has(companyName)) {
        errors.push(`第${lineNum}行：企业「${companyName}」在本次导入中重复`)
        continue
      }
      seenInBatch.add(companyName)

      toCreate.push({
        companyName,
        industry: this.trimOrNull(row['行业']),
        province: this.trimOrNull(row['省份']),
        city: this.trimOrNull(row['城市']),
        phone: this.trimOrNull(row['联系电话']),
        email: this.trimOrNull(row['邮箱']),
        unifiedCreditCode: this.trimOrNull(row['统一社会信用代码']),
        registeredCapital: this.trimOrNull(row['注册资本']),
        legalPerson: this.trimOrNull(row['法人代表']),
        address: this.trimOrNull(row['详细地址']),
        website: this.trimOrNull(row['公司网站']),
        employeeCount: row['员工人数'] ? parseInt(String(row['员工人数']), 10) || null : null,
        businessScope: this.trimOrNull(row['经营范围']),
        remark: this.trimOrNull(row['备注']),
        channel: ProspectChannel.MANUAL,
        status: ProspectStatus.NEW,
        assignedUserId: user.id,
      })
    }

    if (toCreate.length === 0 && errors.length === 0) {
      throw new BadRequestException('Excel 中没有有效数据')
    }

    if (toCreate.length > 0) {
      const entities = this.prospectRepo.create(toCreate)
      await this.prospectRepo.save(entities)
    }

    return { imported: toCreate.length, errors }
  }

  /**
   * Import Excel data directly as customers.
   * Checks for duplicate customers by company name (H2 fix).
   */
  async importAsCustomer(
    buffer: Buffer,
    user: AuthUser,
  ): Promise<{ imported: number; errors: string[] }> {
    const rows = await this.parseExcel(buffer)
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`单次导入不能超过 ${MAX_IMPORT_ROWS} 条`)
    }

    const errors: string[] = []
    const toCreate: Partial<Customer>[] = []

    // 直接导入客户时只和客户表查重，线索池重复不阻断客户创建。
    const allNames: string[] = []
    for (const row of rows) {
      const name = (row['企业名称(必填)'] ?? row['企业名称'] ?? '').trim()
      if (name) allNames.push(name)
    }

    const existingCustomerSet = new Set<string>()
    if (allNames.length > 0) {
      const existing = await this.customerRepo.find({
        where: { company: In(allNames) },
        select: ['company'],
      })
      for (const c of existing) {
        if (c.company) existingCustomerSet.add(c.company)
      }
    }

    const seenInBatch = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const lineNum = i + 2

      const companyName = (row['企业名称(必填)'] ?? row['企业名称'] ?? '').trim()
      if (!companyName) {
        errors.push(`第${lineNum}行：企业名称不能为空`)
        continue
      }

      if (existingCustomerSet.has(companyName)) {
        errors.push(`第${lineNum}行：客户「${companyName}」已存在`)
        continue
      }

      if (seenInBatch.has(companyName)) {
        errors.push(`第${lineNum}行：企业「${companyName}」在本次导入中重复`)
        continue
      }
      seenInBatch.add(companyName)

      toCreate.push({
        name: companyName,
        company: companyName,
        phone: this.trimOrNull(row['联系电话']) ?? undefined,
        email: this.trimOrNull(row['邮箱']) ?? undefined,
        industry: this.trimOrNull(row['行业']) ?? undefined,
        source: CustomerSource.IMPORT,
        status: CustomerStatus.LEAD,
        region: this.trimOrNull(row['省份']) ?? undefined,
        notes: this.trimOrNull(row['备注']) ?? undefined,
        assignedUserId: user.id,
      })
    }

    if (toCreate.length === 0 && errors.length === 0) {
      throw new BadRequestException('Excel 中没有有效数据')
    }

    if (toCreate.length > 0) {
      const entities = this.customerRepo.create(toCreate)
      await this.customerRepo.save(entities)
    }

    return { imported: toCreate.length, errors }
  }

  private async parseExcel(buffer: Buffer): Promise<Array<Record<string, string>>> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    const sheet = workbook.getWorksheet(1)
    if (!sheet) throw new BadRequestException('Excel 文件无有效工作表')

    const headerRow = sheet.getRow(1)
    const headers: string[] = []
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value ?? '').trim()
    })

    const rows: Array<Record<string, string>> = []
    for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
      const row = sheet.getRow(rowIdx)
      const record: Record<string, string> = {}
      let hasData = false
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber]
        if (header) {
          record[header] = String(cell.value ?? '').trim()
          if (record[header]) hasData = true
        }
      })
      // 空行直接跳过，错误行号仍按 Excel 原始行号计算。
      if (hasData) rows.push(record)
    }

    return rows
  }

  private trimOrNull(value: string | undefined | null): string | null {
    const trimmed = (value ?? '').trim()
    return trimmed || null
  }
}
