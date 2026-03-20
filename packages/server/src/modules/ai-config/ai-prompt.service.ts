import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiPromptTemplate } from './ai-prompt-template.entity'
import { AiPromptHistory } from './ai-prompt-history.entity'
import { CreatePromptTemplateDto, UpdatePromptTemplateDto } from './dto/prompt-template.dto'

@Injectable()
export class AiPromptService {
  constructor(
    @InjectRepository(AiPromptTemplate)
    private readonly templateRepo: Repository<AiPromptTemplate>,
    @InjectRepository(AiPromptHistory)
    private readonly historyRepo: Repository<AiPromptHistory>,
  ) {}

  async findAll(): Promise<AiPromptTemplate[]> {
    return this.templateRepo.find({ order: { module: 'ASC', scene: 'ASC' } })
  }

  async findOne(id: number): Promise<AiPromptTemplate> {
    const tpl = await this.templateRepo.findOne({ where: { id } })
    if (!tpl) throw new NotFoundException(`Prompt template #${id} not found`)
    return tpl
  }

  async getActivePrompt(module: string, scene: string): Promise<AiPromptTemplate | null> {
    return this.templateRepo.findOne({
      where: { module, scene, isActive: true },
    })
  }

  async create(dto: CreatePromptTemplateDto, userId: number): Promise<AiPromptTemplate> {
    const entity = this.templateRepo.create({
      ...dto,
      createdById: userId,
      version: 1,
    })
    return this.templateRepo.save(entity)
  }

  async update(
    id: number,
    dto: UpdatePromptTemplateDto,
    userId: number,
  ): Promise<AiPromptTemplate> {
    const tpl = await this.findOne(id)

    // Save history before updating
    const history = this.historyRepo.create({
      templateId: tpl.id,
      version: tpl.version,
      systemPrompt: tpl.systemPrompt,
      userPromptTemplate: tpl.userPromptTemplate,
      changeNote: dto.changeNote ?? null,
      changedById: userId,
    })
    await this.historyRepo.save(history)

    // Update template
    if (dto.name !== undefined) tpl.name = dto.name
    if (dto.systemPrompt !== undefined) tpl.systemPrompt = dto.systemPrompt
    if (dto.userPromptTemplate !== undefined)
      tpl.userPromptTemplate = dto.userPromptTemplate ?? null
    if (dto.isActive !== undefined) tpl.isActive = dto.isActive
    if (dto.description !== undefined) tpl.description = dto.description ?? null
    tpl.version += 1

    return this.templateRepo.save(tpl)
  }

  async remove(id: number): Promise<void> {
    const tpl = await this.findOne(id)
    await this.templateRepo.softRemove(tpl)
  }

  async getHistory(templateId: number): Promise<AiPromptHistory[]> {
    return this.historyRepo.find({
      where: { templateId },
      order: { version: 'DESC' },
    })
  }

  async rollback(id: number, version?: number): Promise<AiPromptTemplate> {
    const tpl = await this.findOne(id)

    // Find history entry
    const historyQuery: Record<string, unknown> = { templateId: id }
    if (version !== undefined) {
      historyQuery['version'] = version
    }
    const history =
      version !== undefined
        ? await this.historyRepo.findOne({ where: { templateId: id, version } })
        : await this.historyRepo.findOne({
            where: { templateId: id },
            order: { version: 'DESC' },
          })

    if (!history) {
      throw new NotFoundException(
        `No history found for template #${id}${version !== undefined ? ` version ${version}` : ''}`,
      )
    }

    tpl.systemPrompt = history.systemPrompt
    tpl.userPromptTemplate = history.userPromptTemplate
    tpl.version += 1

    return this.templateRepo.save(tpl)
  }
}
