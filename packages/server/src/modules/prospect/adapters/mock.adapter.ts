import { Injectable } from '@nestjs/common'
import type { IProspectAdapter } from './prospect-adapter.interface'
import { ProspectChannel } from '@crm/shared'
import type { ProspectSearchQuery, ProspectSearchResult } from '@crm/shared'

/** 模拟企业数据条目 */
interface MockCompany {
  companyName: string
  legalPerson: string
  registeredCapital: string
  establishDate: string
  industry: string
  province: string
  city: string
  address: string
  unifiedCreditCode: string
  phone: string
  email: string
  website: string
  employeeCount: number
  businessScope: string
}

/**
 * 模拟数据适配器 — 用于开发与测试。
 * 内置 200 条多行业/多地域模拟企业数据。
 */
@Injectable()
export class MockProspectAdapter implements IProspectAdapter {
  readonly channel = ProspectChannel.MOCK

  private readonly companies: MockCompany[] = MockProspectAdapter.generateCompanies()

  isAvailable(): boolean {
    return true
  }

  async search(query: ProspectSearchQuery): Promise<{
    results: ProspectSearchResult[]
    total: number
    cost: number
  }> {
    let filtered = [...this.companies]

    if (query.keyword) {
      const kw = query.keyword.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.companyName.toLowerCase().includes(kw) || c.businessScope.toLowerCase().includes(kw),
      )
    }

    if (query.industry) {
      filtered = filtered.filter((c) => c.industry === query.industry)
    }

    if (query.province) {
      filtered = filtered.filter((c) => c.province === query.province)
    }

    if (query.city) {
      filtered = filtered.filter((c) => c.city === query.city)
    }

    if (query.minRegisteredCapital !== undefined) {
      filtered = filtered.filter((c) => {
        const cap = parseFloat(c.registeredCapital)
        return !isNaN(cap) && cap >= (query.minRegisteredCapital ?? 0)
      })
    }

    if (query.maxRegisteredCapital !== undefined) {
      filtered = filtered.filter((c) => {
        const cap = parseFloat(c.registeredCapital)
        return !isNaN(cap) && cap <= (query.maxRegisteredCapital ?? Infinity)
      })
    }

    if (query.minEmployeeCount !== undefined) {
      filtered = filtered.filter((c) => c.employeeCount >= (query.minEmployeeCount ?? 0))
    }

    if (query.maxEmployeeCount !== undefined) {
      filtered = filtered.filter((c) => c.employeeCount <= (query.maxEmployeeCount ?? Infinity))
    }

    const total = filtered.length
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const start = (page - 1) * pageSize
    const paged = filtered.slice(start, start + pageSize)

    const results: ProspectSearchResult[] = paged.map((c) => ({
      ...c,
      channel: ProspectChannel.MOCK,
    }))

    return { results, total, cost: 0 }
  }

  async getDetail(companyName: string): Promise<ProspectSearchResult | null> {
    const found = this.companies.find((c) => c.companyName === companyName)
    if (!found) return null
    return { ...found, channel: ProspectChannel.MOCK }
  }

  /* ------ 生成 200 条模拟数据 ------ */
  private static generateCompanies(): MockCompany[] {
    const industries = [
      '互联网/IT',
      '制造业',
      '金融',
      '教育',
      '医疗健康',
      '房地产',
      '零售',
      '物流运输',
      '农业',
      '能源',
    ]
    const provinces = [
      '广东',
      '上海',
      '北京',
      '浙江',
      '江苏',
      '四川',
      '湖北',
      '山东',
      '福建',
      '河南',
    ]
    const citiesByProvince: Record<string, string[]> = {
      广东: ['深圳', '广州', '东莞', '佛山'],
      上海: ['上海'],
      北京: ['北京'],
      浙江: ['杭州', '宁波', '温州'],
      江苏: ['南京', '苏州', '无锡'],
      四川: ['成都', '绵阳'],
      湖北: ['武汉', '宜昌'],
      山东: ['济南', '青岛', '烟台'],
      福建: ['福州', '厦门'],
      河南: ['郑州', '洛阳'],
    }
    const surNames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴']
    const givenNames = ['伟', '芳', '强', '丽', '敏', '洋', '磊', '静', '涛', '慧']
    const companyPrefixes = [
      '华创',
      '鑫达',
      '中天',
      '博远',
      '恒通',
      '盛世',
      '瑞安',
      '嘉禾',
      '智联',
      '新锐',
      '远大',
      '宏图',
      '启航',
      '卓越',
      '汇丰',
      '金鹏',
      '翔宇',
      '明德',
      '正大',
      '联合',
    ]
    const companySuffixes = [
      '科技',
      '实业',
      '集团',
      '控股',
      '信息技术',
      '智能科技',
      '商贸',
      '投资',
      '生物科技',
      '新材料',
    ]

    const companies: MockCompany[] = []
    for (let i = 0; i < 200; i++) {
      const province = provinces[i % provinces.length]
      const cities = citiesByProvince[province]
      const city = cities[i % cities.length]
      const industry = industries[i % industries.length]
      const prefix = companyPrefixes[i % companyPrefixes.length]
      const suffix = companySuffixes[Math.floor(i / 20) % companySuffixes.length]
      const surName = surNames[i % surNames.length]
      const givenName = givenNames[(i + 3) % givenNames.length]
      const capital = [100, 200, 500, 1000, 2000, 3000, 5000, 8000, 10000, 50000][i % 10]
      const employees = [10, 30, 50, 100, 200, 500, 800, 1000, 2000, 5000][i % 10]
      const year = 2005 + (i % 20)
      const month = String((i % 12) + 1).padStart(2, '0')
      const day = String((i % 28) + 1).padStart(2, '0')

      companies.push({
        companyName: `${city}${prefix}${suffix}有限公司`,
        legalPerson: `${surName}${givenName}`,
        registeredCapital: `${capital}`,
        establishDate: `${year}-${month}-${day}`,
        industry,
        province,
        city,
        address: `${province}${city}高新技术产业开发区创业路${i + 1}号`,
        unifiedCreditCode: `91${String(440000 + i * 7).padStart(6, '0')}MA${String(1000000 + i).slice(-7)}X${String(i % 10)}`,
        phone: `0${String(755 + (i % 30)).slice(0, 3)}-${String(80000000 + i * 37).slice(0, 8)}`,
        email: `contact@${prefix.toLowerCase()}${i}.com`,
        website: `https://www.${prefix.toLowerCase()}${i}.com`,
        employeeCount: employees,
        businessScope: `从事${industry}领域的技术开发、技术咨询、技术服务；货物及技术进出口。`,
      })
    }
    return companies
  }
}
