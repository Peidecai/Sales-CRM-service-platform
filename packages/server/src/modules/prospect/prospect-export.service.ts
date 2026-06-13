import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder } from 'typeorm'
import * as ExcelJS from 'exceljs'
import { Prospect } from './prospect.entity'
import { UserRole, ProspectStatus, ProspectChannel } from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

const STATUS_LABELS: Record<string, string> = {
  [ProspectStatus.NEW]: '新线索',
  [ProspectStatus.CONTACTED]: '已联系',
  [ProspectStatus.QUALIFIED]: '已确认',
  [ProspectStatus.CONVERTED]: '已转化',
  [ProspectStatus.REJECTED]: '已废弃',
}

const CHANNEL_LABELS: Record<string, string> = {
  [ProspectChannel.TIANYANCHA]: '天眼查',
  [ProspectChannel.QICHACHA]: '企查查',
  [ProspectChannel.MANUAL]: '手动录入',
  [ProspectChannel.MOCK]: '模拟数据',
}

@Injectable()
export class ProspectExportService {
  constructor(
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
  ) {}

  /**
   * Export prospects as Excel (.xlsx) buffer.
   */
  async exportExcel(user: AuthUser): Promise<Buffer> {
    const qb = this.prospectRepo.createQueryBuilder('prospect')

    this.applyDataPermission(qb, user)
    qb.orderBy('prospect.updatedAt', 'DESC').take(5000)

    const prospects = await qb.getMany()

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('线索列表')

    sheet.columns = [
      { header: '企业名称', key: 'companyName', width: 25 },
      { header: '法人代表', key: 'legalPerson', width: 15 },
      { header: '注册资本', key: 'registeredCapital', width: 15 },
      { header: '成立日期', key: 'establishDate', width: 15 },
      { header: '行业', key: 'industry', width: 15 },
      { header: '省份', key: 'province', width: 12 },
      { header: '城市', key: 'city', width: 12 },
      { header: '详细地址', key: 'address', width: 30 },
      { header: '统一社会信用代码', key: 'unifiedCreditCode', width: 22 },
      { header: '联系电话', key: 'phone', width: 18 },
      { header: '邮箱', key: 'email', width: 25 },
      { header: '公司网站', key: 'website', width: 25 },
      { header: '员工人数', key: 'employeeCount', width: 12 },
      { header: '经营范围', key: 'businessScope', width: 40 },
      { header: '状态', key: 'status', width: 12 },
      { header: '渠道', key: 'channel', width: 12 },
      { header: '备注', key: 'remark', width: 25 },
    ]

    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }

    for (const p of prospects) {
      sheet.addRow({
        ...p,
        status: STATUS_LABELS[p.status] ?? p.status,
        channel: CHANNEL_LABELS[p.channel] ?? p.channel,
      })
    }

    return Buffer.from(await workbook.xlsx.writeBuffer()) as Buffer
  }

  /** Apply data permission: SALES users can only see their own records */
  private applyDataPermission(qb: SelectQueryBuilder<Prospect>, user: AuthUser): void {
    if (user.role === UserRole.SALES) {
      qb.andWhere('prospect.assignedUserId = :currentUserId', { currentUserId: user.id })
    }
  }
}
