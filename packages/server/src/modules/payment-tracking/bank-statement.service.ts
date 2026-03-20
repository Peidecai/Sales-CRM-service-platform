import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BankStatement } from './entities/bank-statement.entity'
import { PaymentPlanItem } from './entities/payment-plan-item.entity'
import { MatchStatementDto } from './dto/payment-tracking.dto'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

@Injectable()
export class BankStatementService {
  constructor(
    @InjectRepository(BankStatement)
    private readonly statementRepo: Repository<BankStatement>,
    @InjectRepository(PaymentPlanItem)
    private readonly itemRepo: Repository<PaymentPlanItem>,
  ) {}

  async importCsv(
    csvContent: string,
    user: AuthUser,
  ): Promise<{ imported: number; errors: string[] }> {
    const lines = csvContent
      .replace(/^\uFEFF/, '')
      .split('\n')
      .filter((l) => l.trim())
    if (lines.length < 2) return { imported: 0, errors: ['CSV 文件为空或缺少数据行'] }

    const errors: string[] = []
    let imported = 0

    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = this.parseCsvLine(lines[i])
        if (cols.length < 3) {
          errors.push(`行 ${i + 1}: 列数不足`)
          continue
        }

        await this.statementRepo.save(
          this.statementRepo.create({
            transactionDate: cols[0],
            amount: parseFloat(cols[1]),
            payerName: cols[2],
            payerAccount: cols[3] || null,
            reference: cols[4] || null,
            matchStatus: 'unmatched',
            importedById: user.id,
          }),
        )
        imported++
      } catch (err) {
        errors.push(`行 ${i + 1}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return { imported, errors }
  }

  /** RFC 4180 compliant CSV line parser — handles quoted fields with commas */
  private parseCsvLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (ch === '"') {
          inQuotes = false
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',') {
          result.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
    }
    result.push(current.trim())
    return result
  }

  async findAll(page: number, pageSize: number) {
    const [list, total] = await this.statementRepo.findAndCount({
      order: { transactionDate: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    return { list, total, page, pageSize }
  }

  async manualMatch(statementId: number, dto: MatchStatementDto): Promise<BankStatement> {
    const stmt = await this.statementRepo.findOne({ where: { id: statementId } })
    if (!stmt) throw new NotFoundException(`流水 #${statementId} 不存在`)
    const item = await this.itemRepo.findOne({ where: { id: dto.planItemId } })
    if (!item) throw new NotFoundException(`行项 #${dto.planItemId} 不存在`)

    stmt.matchedPlanItemId = dto.planItemId
    stmt.matchStatus = 'manual_matched'
    return this.statementRepo.save(stmt)
  }

  async autoMatch(): Promise<{ matched: number; total: number }> {
    const unmatched = await this.statementRepo.find({ where: { matchStatus: 'unmatched' } })
    let matched = 0

    for (const stmt of unmatched) {
      const item = await this.itemRepo
        .createQueryBuilder('ppi')
        .where('ppi.amount = :amount', { amount: stmt.amount })
        .andWhere('ppi.status IN (:...statuses)', { statuses: ['pending', 'overdue'] })
        .getOne()

      if (item) {
        stmt.matchedPlanItemId = item.id
        stmt.matchStatus = 'auto_matched'
        await this.statementRepo.save(stmt)

        item.paidAmount = Number(item.paidAmount) + Number(stmt.amount)
        item.paidAt = new Date()
        item.status = Number(item.paidAmount) >= Number(item.amount) ? 'paid' : 'partial'
        await this.itemRepo.save(item)

        matched++
      }
    }

    return { matched, total: unmatched.length }
  }
}
