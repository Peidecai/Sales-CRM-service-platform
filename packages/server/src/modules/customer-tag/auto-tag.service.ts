import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Customer } from '../customer/customer.entity'
import { CustomerTagService } from './customer-tag.service'

interface AutoTagRule {
  tagName: string
  group: string
  condition: (c: Customer) => boolean
}

@Injectable()
export class AutoTagService {
  private readonly logger = new Logger(AutoTagService.name)

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly tagService: CustomerTagService,
  ) {}

  private readonly rules: AutoTagRule[] = [
    { tagName: '制造业', group: '行业', condition: (c) => c.industry === 'manufacturing' },
    {
      tagName: '互联网',
      group: '行业',
      condition: (c) => c.industry === 'internet' || c.industry === 'technology',
    },
    {
      tagName: '大企业',
      group: '规模',
      condition: (c) => c.scale === 'large' || c.scale === 'enterprise',
    },
    {
      tagName: '华东区',
      group: '区域',
      condition: (c) => ['上海', '江苏', '浙江', '安徽'].some((r) => c.region?.includes(r)),
    },
    {
      tagName: '华南区',
      group: '区域',
      condition: (c) => ['广东', '广西', '海南', '深圳'].some((r) => c.region?.includes(r)),
    },
    {
      tagName: '网络来源',
      group: '来源',
      condition: (c) => c.source === 'website' || c.source === 'ad',
    },
    { tagName: '高价值', group: '成交额', condition: (c) => Number(c.annualRevenue) >= 100 },
    { tagName: '高意向', group: '意向', condition: (c) => (c.intentionLevel ?? 0) >= 4 },
    {
      tagName: '新客户',
      group: '状态',
      condition: (c) => c.status === 'lead' || c.status === 'potential',
    },
  ]

  @Cron('0 3 * * *', { name: 'auto-tag-customers' })
  async handleAutoTag(): Promise<void> {
    this.logger.log('开始执行自动打标任务...')
    const customers = await this.customerRepo.find({ where: { deleted: false } })
    let taggedCount = 0

    for (const customer of customers) {
      for (const rule of this.rules) {
        if (rule.condition(customer)) {
          let tag = await this.tagService.findByName(rule.tagName)
          if (!tag) {
            tag = await this.tagService.create({
              name: rule.tagName,
              group: rule.group,
            })
          }
          await this.tagService.addTagToCustomer(customer.id, tag.id)
          taggedCount++
        }
      }
    }

    this.logger.log(`自动打标完成，执行了 ${taggedCount} 次打标操作`)
  }

  async evaluateCustomer(customerId: number): Promise<void> {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId, deleted: false },
    })
    if (!customer) return

    for (const rule of this.rules) {
      if (rule.condition(customer)) {
        let tag = await this.tagService.findByName(rule.tagName)
        if (!tag) {
          tag = await this.tagService.create({
            name: rule.tagName,
            group: rule.group,
          })
        }
        await this.tagService.addTagToCustomer(customer.id, tag.id)
      }
    }
  }
}
