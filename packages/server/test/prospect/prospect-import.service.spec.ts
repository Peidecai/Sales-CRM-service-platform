/* ---------- ExcelJS in-memory mock (fixes ESM/CJS jest compat) ---------- */
const __excelStore = new Map<string, unknown>()
let __excelSeq = 0

class MockCell {
  value: unknown = null
}

class MockRow {
  private cells: Record<number, MockCell> = {}
  font: unknown = {}
  fill: unknown = {}
  values: unknown[] = []

  getCell(col: number): MockCell {
    if (!this.cells[col]) this.cells[col] = new MockCell()
    return this.cells[col]
  }

  eachCell(cb: (cell: MockCell, colNumber: number) => void): void {
    const indices = Object.keys(this.cells)
      .map(Number)
      .sort((a, b) => a - b)
    for (const idx of indices) {
      cb(this.cells[idx], idx)
    }
  }

  /** Set cell values from an array (1-indexed) */
  _setFromArray(values: unknown[]): void {
    for (let i = 0; i < values.length; i++) {
      const cell = this.getCell(i + 1)
      cell.value = values[i] ?? null
    }
  }

  /** Set cell values from a keyed object using column definitions */
  _setFromObject(obj: Record<string, unknown>, columns: Array<{ key?: string }>): void {
    for (let i = 0; i < columns.length; i++) {
      const key = columns[i].key
      const cell = this.getCell(i + 1)
      cell.value = key && obj[key] !== undefined ? obj[key] : null
    }
  }
}

class MockWorksheet {
  name: string
  private rows: Record<number, MockRow> = {}
  private _rowCount = 0
  private _columns: Array<{ header?: string; key?: string; width?: number }> = []

  constructor(name: string) {
    this.name = name
  }

  get columns() {
    return this._columns
  }

  set columns(cols: Array<{ header?: string; key?: string; width?: number }>) {
    this._columns = cols
    // Auto-create header row from column definitions
    if (cols.length > 0) {
      const headerRow = this.getRow(1)
      for (let i = 0; i < cols.length; i++) {
        headerRow.getCell(i + 1).value = cols[i].header ?? null
      }
      if (this._rowCount < 1) this._rowCount = 1
    }
  }

  get rowCount() {
    return this._rowCount
  }

  getRow(rowNum: number): MockRow {
    if (!this.rows[rowNum]) this.rows[rowNum] = new MockRow()
    return this.rows[rowNum]
  }

  addRow(data: unknown[] | Record<string, unknown>): MockRow {
    this._rowCount++
    const row = this.getRow(this._rowCount)
    if (Array.isArray(data)) {
      row._setFromArray(data)
    } else if (this._columns.length > 0) {
      row._setFromObject(data as Record<string, unknown>, this._columns)
    }
    return row
  }

  /** Serialize for mock buffer storage */
  _serialize(): unknown {
    const rowData: Record<number, Record<number, unknown>> = {}
    for (const [rIdx, row] of Object.entries(this.rows)) {
      const cells: Record<number, unknown> = {}
      row.eachCell((cell, col) => {
        cells[col] = cell.value
      })
      rowData[Number(rIdx)] = cells
    }
    return { name: this.name, rowCount: this._rowCount, rows: rowData }
  }

  /** Deserialize from mock buffer storage */
  _deserialize(data: { name: string; rowCount: number; rows: Record<number, Record<number, unknown>> }): void {
    this.name = data.name
    this._rowCount = data.rowCount
    for (const [rIdx, cells] of Object.entries(data.rows)) {
      const row = this.getRow(Number(rIdx))
      for (const [cIdx, value] of Object.entries(cells as Record<number, unknown>)) {
        row.getCell(Number(cIdx)).value = value
      }
    }
  }
}

class MockWorkbook {
  private sheets: MockWorksheet[] = []
  xlsx = {
    writeBuffer: async (): Promise<ArrayBuffer> => {
      const id = `__excel_${++__excelSeq}`
      __excelStore.set(id, this.sheets.map((s) => (s as MockWorksheet)._serialize()))
      return Buffer.from(id) as unknown as ArrayBuffer
    },
    load: async (buf: ArrayBuffer): Promise<void> => {
      const id = Buffer.from(buf as unknown as Buffer).toString()
      const data = __excelStore.get(id) as Array<{ name: string; rowCount: number; rows: Record<number, Record<number, unknown>> }> | undefined
      if (data) {
        this.sheets = []
        for (const sd of data) {
          const ws = new MockWorksheet(sd.name)
          ws._deserialize(sd)
          this.sheets.push(ws)
        }
      }
    },
  }

  addWorksheet(name: string): MockWorksheet {
    const ws = new MockWorksheet(name)
    this.sheets.push(ws)
    return ws
  }

  getWorksheet(index: number): MockWorksheet | undefined {
    return this.sheets[index - 1]
  }

  get worksheets(): MockWorksheet[] {
    return this.sheets
  }
}

jest.mock('exceljs', () => ({
  __esModule: true,
  default: { Workbook: MockWorkbook },
  Workbook: MockWorkbook,
}))

import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ProspectImportService } from '../../src/modules/prospect/prospect-import.service'
import { Prospect } from '../../src/modules/prospect/prospect.entity'
import { Customer } from '../../src/modules/customer/customer.entity'
import { createMockRepository } from '../test-utils'
import type { MockRepository } from '../test-utils'
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
