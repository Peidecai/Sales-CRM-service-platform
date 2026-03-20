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
