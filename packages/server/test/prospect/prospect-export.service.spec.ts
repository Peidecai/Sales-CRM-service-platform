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
import { ProspectExportService } from '../../src/modules/prospect/prospect-export.service'
import { Prospect } from '../../src/modules/prospect/prospect.entity'
import {
  createMockRepository,
  createMockQueryBuilder,
  type MockRepository,
  type MockQueryBuilder,
} from '../test-utils'
import { UserRole, ProspectStatus, ProspectChannel } from '@crm/shared'
import ExcelJS from 'exceljs'
import type { AuthUser } from '../../src/common/decorators/current-user.decorator'

describe('ProspectExportService', () => {
  let service: ProspectExportService
  let prospectRepo: MockRepository
  let mockQb: MockQueryBuilder

  const adminUser: AuthUser = { id: 1, role: UserRole.ADMIN, username: 'admin' }
  const salesUser: AuthUser = { id: 2, role: UserRole.SALES, username: 'sales' }

  beforeEach(async () => {
    prospectRepo = createMockRepository()
    mockQb = createMockQueryBuilder([])

    prospectRepo.createQueryBuilder.mockReturnValue(mockQb)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectExportService,
        { provide: getRepositoryToken(Prospect), useValue: prospectRepo },
      ],
    }).compile()

    service = module.get(ProspectExportService)
  })

  it('should return a valid Excel buffer', async () => {
    mockQb.getMany.mockResolvedValue([])
    const buffer = await service.exportExcel(adminUser)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    const sheet = workbook.getWorksheet(1)
    expect(sheet).toBeDefined()
    expect(sheet!.name).toBe('线索列表')
  })

  it('should export data with Chinese labels for status and channel', async () => {
    mockQb.getMany.mockResolvedValue([
      {
        companyName: '测试公司',
        status: ProspectStatus.NEW,
        channel: ProspectChannel.TIANYANCHA,
        legalPerson: '张三',
      },
    ])

    const buffer = await service.exportExcel(adminUser)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    const sheet = workbook.getWorksheet(1)!
    const row2 = sheet.getRow(2)
    // status column is #15, channel is #16
    expect(row2.getCell(15).value).toBe('新线索')
    expect(row2.getCell(16).value).toBe('天眼查')
  })

  it('should apply data permission for SALES users', async () => {
    mockQb.getMany.mockResolvedValue([])
    await service.exportExcel(salesUser)
    expect(mockQb.andWhere).toHaveBeenCalledWith(
      'prospect.assignedUserId = :currentUserId',
      { currentUserId: 2 },
    )
  })

  it('should NOT apply data permission for ADMIN users', async () => {
    mockQb.getMany.mockResolvedValue([])
    await service.exportExcel(adminUser)
    expect(mockQb.andWhere).not.toHaveBeenCalled()
  })

  it('should limit export to 5000 rows', async () => {
    mockQb.getMany.mockResolvedValue([])
    await service.exportExcel(adminUser)
    expect(mockQb.take).toHaveBeenCalledWith(5000)
  })
})
