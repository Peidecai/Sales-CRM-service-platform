import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ProspectImportService } from '../../src/modules/prospect/prospect-import.service'
import { Prospect } from '../../src/modules/prospect/prospect.entity'
import { Customer } from '../../src/modules/customer/customer.entity'
import { createMockRepository, type MockRepository } from '../test-utils'
import { ProspectChannel, ProspectStatus, CustomerStatus, CustomerSource } from '@crm/shared'
import { BadRequestException } from '@nestjs/common'
import ExcelJS from 'exceljs'
import type { AuthUser } from '../../src/common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'

describe('ProspectImportService', () => {
  let service: ProspectImportService
  let prospectRepo: MockRepository
  let customerRepo: MockRepository

  const adminUser: AuthUser = { id: 1, role: UserRole.ADMIN, username: 'admin' }

  beforeEach(async () => {
    prospectRepo = createMockRepository()
    customerRepo = createMockRepository()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectImportService,
        { provide: getRepositoryToken(Prospect), useValue: prospectRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
      ],
    }).compile()

    service = module.get(ProspectImportService)
  })

  describe('generateImportTemplate', () => {
    it('should return a valid Excel buffer', async () => {
      const buffer = await service.generateImportTemplate()
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)

      // Verify it's a valid Excel file
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
      const sheet = workbook.getWorksheet(1)
      expect(sheet).toBeDefined()
      expect(sheet!.name).toBe('线索导入模板')
    })

    it('should have 14 columns with correct headers', async () => {
      const buffer = await service.generateImportTemplate()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
      const sheet = workbook.getWorksheet(1)!
      const headerRow = sheet.getRow(1)
      const headers: string[] = []
      headerRow.eachCell((cell) => {
        headers.push(String(cell.value))
      })
      expect(headers[0]).toBe('企业名称(必填)')
      expect(headers.length).toBe(14)
    })

    it('should include an example data row', async () => {
      const buffer = await service.generateImportTemplate()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
      const sheet = workbook.getWorksheet(1)!
      expect(sheet.rowCount).toBeGreaterThanOrEqual(2)
      const row2 = sheet.getRow(2)
      expect(row2.getCell(1).value).toBe('示例科技有限公司')
    })
  })

  describe('importAsProspect', () => {
    async function makeExcel(rows: Record<string, string>[]): Promise<Buffer> {
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Sheet1')
      const headers = Object.keys(rows[0] ?? {})
      sheet.addRow(headers)
      for (const row of rows) {
        sheet.addRow(headers.map((h) => row[h] ?? ''))
      }
      return Buffer.from(await workbook.xlsx.writeBuffer()) as Buffer
    }

    it('should import valid rows as prospects', async () => {
      const buffer = await makeExcel([
        { '企业名称(必填)': '公司A', '行业': 'IT' },
        { '企业名称(必填)': '公司B', '行业': '金融' },
      ])

      prospectRepo.find.mockResolvedValue([])
      prospectRepo.create.mockImplementation((data: unknown) => data)
      prospectRepo.save.mockResolvedValue([])

      const result = await service.importAsProspect(buffer, adminUser)
      expect(result.imported).toBe(2)
      expect(result.errors).toHaveLength(0)
      expect(prospectRepo.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            companyName: '公司A',
            channel: ProspectChannel.MANUAL,
            status: ProspectStatus.NEW,
          }),
        ]),
      )
    })

    it('should skip rows with empty company name', async () => {
      const buffer = await makeExcel([
        { '企业名称(必填)': '', '行业': 'IT' },
        { '企业名称(必填)': '公司B', '行业': '金融' },
      ])

      prospectRepo.find.mockResolvedValue([])
      prospectRepo.create.mockImplementation((data: unknown) => data)
      prospectRepo.save.mockResolvedValue([])

      const result = await service.importAsProspect(buffer, adminUser)
      expect(result.imported).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('第2行')
    })

    it('should detect existing prospects (batch dedup)', async () => {
      const buffer = await makeExcel([
        { '企业名称(必填)': '已存在公司', '行业': 'IT' },
        { '企业名称(必填)': '新公司', '行业': '金融' },
      ])

      prospectRepo.find.mockResolvedValue([{ companyName: '已存在公司' }])
      prospectRepo.create.mockImplementation((data: unknown) => data)
      prospectRepo.save.mockResolvedValue([])

      const result = await service.importAsProspect(buffer, adminUser)
      expect(result.imported).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('已存在于线索池中')
    })

    it('should detect intra-batch duplicates', async () => {
      const buffer = await makeExcel([
        { '企业名称(必填)': '重复公司', '行业': 'IT' },
        { '企业名称(必填)': '重复公司', '行业': '金融' },
      ])

      prospectRepo.find.mockResolvedValue([])
      prospectRepo.create.mockImplementation((data: unknown) => data)
      prospectRepo.save.mockResolvedValue([])

      const result = await service.importAsProspect(buffer, adminUser)
      expect(result.imported).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('本次导入中重复')
    })

    it('should throw on empty Excel', async () => {
      const workbook = new ExcelJS.Workbook()
      workbook.addWorksheet('Sheet1')
      const buffer = Buffer.from(await workbook.xlsx.writeBuffer()) as Buffer

      await expect(service.importAsProspect(buffer, adminUser)).rejects.toThrow(BadRequestException)
    })
  })

  describe('importAsCustomer', () => {
    async function makeExcel(rows: Record<string, string>[]): Promise<Buffer> {
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Sheet1')
      const headers = Object.keys(rows[0] ?? {})
      sheet.addRow(headers)
      for (const row of rows) {
        sheet.addRow(headers.map((h) => row[h] ?? ''))
      }
      return Buffer.from(await workbook.xlsx.writeBuffer()) as Buffer
    }

    it('should import valid rows as customers', async () => {
      const buffer = await makeExcel([
        { '企业名称(必填)': '客户A', '邮箱': 'a@test.com' },
      ])

      customerRepo.find.mockResolvedValue([])
      customerRepo.create.mockImplementation((data: unknown) => data)
      customerRepo.save.mockResolvedValue([])

      const result = await service.importAsCustomer(buffer, adminUser)
      expect(result.imported).toBe(1)
      expect(customerRepo.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: '客户A',
            source: CustomerSource.IMPORT,
            status: CustomerStatus.LEAD,
          }),
        ]),
      )
    })

    it('should detect duplicate customers by company name', async () => {
      const buffer = await makeExcel([
        { '企业名称(必填)': '已存在客户', '邮箱': 'a@test.com' },
      ])

      customerRepo.find.mockResolvedValue([{ company: '已存在客户' }])
      customerRepo.create.mockImplementation((data: unknown) => data)
      customerRepo.save.mockResolvedValue([])

      const result = await service.importAsCustomer(buffer, adminUser)
      expect(result.imported).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('已存在')
    })
  })
})
