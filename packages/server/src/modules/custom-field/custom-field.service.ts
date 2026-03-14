import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CustomFieldDefinition, FieldType } from './custom-field-definition.entity'
import { CreateCustomFieldDto } from './dto/create-custom-field.dto'

@Injectable()
export class CustomFieldService {
  constructor(
    @InjectRepository(CustomFieldDefinition)
    private readonly defRepo: Repository<CustomFieldDefinition>,
  ) {}

  async findAll(): Promise<CustomFieldDefinition[]> {
    return this.defRepo.find({
      where: { isActive: true },
      order: { sort: 'ASC', createdAt: 'ASC' },
    })
  }

  async findOne(id: number): Promise<CustomFieldDefinition> {
    const def = await this.defRepo.findOne({ where: { id } })
    if (!def) throw new NotFoundException(`Field definition ${id} not found`)
    return def
  }

  async create(dto: CreateCustomFieldDto): Promise<CustomFieldDefinition> {
    const existing = await this.defRepo.findOne({
      where: { fieldKey: dto.fieldKey },
    })
    if (existing) throw new ConflictException(`字段标识"${dto.fieldKey}"已存在`)

    const def = this.defRepo.create(dto)
    return this.defRepo.save(def)
  }

  async update(id: number, dto: Partial<CreateCustomFieldDto>): Promise<CustomFieldDefinition> {
    const def = await this.findOne(id)

    if (dto.fieldKey && dto.fieldKey !== def.fieldKey) {
      const existing = await this.defRepo.findOne({
        where: { fieldKey: dto.fieldKey },
      })
      if (existing) throw new ConflictException(`字段标识"${dto.fieldKey}"已存在`)
    }

    Object.assign(def, dto)
    return this.defRepo.save(def)
  }

  async remove(id: number): Promise<void> {
    const def = await this.findOne(id)
    await this.defRepo.softRemove(def)
  }

  async validateCustomFields(customFields: Record<string, unknown>): Promise<void> {
    if (!customFields) return

    const definitions = await this.findAll()
    const errors: string[] = []

    for (const def of definitions) {
      const value = customFields[def.fieldKey]

      if (def.required && (value === undefined || value === null || value === '')) {
        errors.push(`自定义字段"${def.fieldLabel}"为必填项`)
        continue
      }

      if (value === undefined || value === null) continue

      switch (def.fieldType) {
        case FieldType.NUMBER:
          if (typeof value !== 'number') errors.push(`"${def.fieldLabel}"必须为数字`)
          break
        case FieldType.DATE:
          if (isNaN(Date.parse(value as string))) errors.push(`"${def.fieldLabel}"日期格式不正确`)
          break
        case FieldType.SELECT:
        case FieldType.RADIO:
          if (def.options && !def.options.includes(value as string))
            errors.push(`"${def.fieldLabel}"值不在可选范围内`)
          break
        case FieldType.MULTI_SELECT:
        case FieldType.CHECKBOX:
          if (!Array.isArray(value)) errors.push(`"${def.fieldLabel}"必须为数组`)
          break
      }
    }

    if (errors.length > 0) throw new BadRequestException(errors.join('; '))
  }
}
