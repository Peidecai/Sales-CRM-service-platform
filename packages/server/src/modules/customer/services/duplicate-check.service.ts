import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Customer } from '../customer.entity'
import { Contact } from '../../contact/contact.entity'
import { CheckDuplicateDto } from '../dto/check-duplicate.dto'

export interface DuplicateResult {
  customer: Customer
  matchType: string
  confidence: number
}

@Injectable()
export class DuplicateCheckService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  async checkDuplicates(input: CheckDuplicateDto): Promise<DuplicateResult[]> {
    const results: DuplicateResult[] = []

    // Dimension 1: Unified credit code exact match (100%)
    if (input.unifiedCreditCode) {
      const matches = await this.customerRepo.find({
        where: { unifiedCreditCode: input.unifiedCreditCode },
      })
      results.push(
        ...matches.map((c) => ({
          customer: c,
          matchType: 'unified_credit_code',
          confidence: 100,
        })),
      )
    }

    // Dimension 2: Phone exact match (95%)
    if (input.phone) {
      const matches = await this.customerRepo.find({
        where: { phone: input.phone },
      })
      results.push(
        ...matches.map((c) => ({
          customer: c,
          matchType: 'phone',
          confidence: 95,
        })),
      )
    }

    // Dimension 3: Email exact match (90%)
    if (input.email) {
      const matches = await this.customerRepo.find({
        where: { email: input.email },
      })
      results.push(
        ...matches.map((c) => ({
          customer: c,
          matchType: 'email',
          confidence: 90,
        })),
      )
    }

    // Dimension 4: Company name fuzzy match via SOUNDEX
    if (input.company) {
      const candidates = await this.customerRepo
        .createQueryBuilder('c')
        .andWhere('SOUNDEX(c.company) = SOUNDEX(:company)', {
          company: input.company,
        })
        .getMany()

      const filtered = candidates.filter((c) => {
        const similarity = this.levenshteinSimilarity(
          input.company!.toLowerCase(),
          (c.company ?? '').toLowerCase(),
        )
        return similarity >= 0.8
      })

      results.push(
        ...filtered.map((c) => ({
          customer: c,
          matchType: 'company_fuzzy',
          confidence: Math.round(
            this.levenshteinSimilarity(
              input.company!.toLowerCase(),
              (c.company ?? '').toLowerCase(),
            ) * 100,
          ),
        })),
      )
    }

    // Dimension 5: Contact mobile cross-match (85%)
    if (input.contactMobile) {
      const contactMatches = await this.contactRepo.find({
        where: { mobile: input.contactMobile },
      })
      if (contactMatches.length > 0) {
        const customerIds = [...new Set(contactMatches.map((c) => c.customerId))]
        for (const custId of customerIds) {
          const customer = await this.customerRepo.findOne({
            where: { id: custId },
          })
          if (customer) {
            results.push({
              customer,
              matchType: 'contact_mobile',
              confidence: 85,
            })
          }
        }
      }
    }

    return this.deduplicateResults(results)
  }

  private deduplicateResults(results: DuplicateResult[]): DuplicateResult[] {
    const map = new Map<number, DuplicateResult>()
    for (const r of results) {
      const existing = map.get(r.customer.id)
      if (!existing || existing.confidence < r.confidence) {
        map.set(r.customer.id, r)
      }
    }
    return Array.from(map.values())
  }

  private levenshteinSimilarity(a: string, b: string): number {
    if (a === b) return 1
    const maxLen = Math.max(a.length, b.length)
    if (maxLen === 0) return 1
    return 1 - this.levenshteinDistance(a, b) / maxLen
  }

  private levenshteinDistance(a: string, b: string): number {
    const m = a.length
    const n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
      }
    }
    return dp[m][n]
  }
}
