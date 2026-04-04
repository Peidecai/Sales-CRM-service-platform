import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ContractTemplate } from './entities/contract-template.entity'
import { CreateContractTemplateDto } from './dto/create-contract-template.dto'
import { QueryContractTemplateDto } from './dto/query-contract-template.dto'

@Injectable()
export class ContractTemplateService {
  constructor(
    @InjectRepository(ContractTemplate)
    private readonly templateRepository: Repository<ContractTemplate>,
  ) {}

  async findAll(
    query: QueryContractTemplateDto,
  ): Promise<{ list: ContractTemplate[]; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 20, category } = query
    const qb = this.templateRepository.createQueryBuilder('t')

    if (category) {
      qb.andWhere('t.category = :category', { category })
    }

    qb.orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<ContractTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } })
    if (!template) throw new NotFoundException(`Contract template ${id} not found`)
    return template
  }

  async create(dto: CreateContractTemplateDto, createdBy: number): Promise<ContractTemplate> {
    const entity = this.templateRepository.create({
      ...dto,
      createdBy,
    })
    return this.templateRepository.save(entity)
  }

  async update(id: number, dto: Partial<CreateContractTemplateDto>): Promise<ContractTemplate> {
    const template = await this.findOne(id)
    Object.assign(template, dto)
    return this.templateRepository.save(template)
  }

  async remove(id: number): Promise<void> {
    const template = await this.findOne(id)
    await this.templateRepository.softRemove(template)
  }

  renderTemplate(content: string, variables: Record<string, string>): string {
    let rendered = content
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
    return rendered
  }
}
