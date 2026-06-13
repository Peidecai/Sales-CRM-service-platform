import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SpeechAnnotation } from './entities/speech-annotation.entity'
import { CreateSpeechAnnotationDto } from './dto/create-speech-annotation.dto'
import { UpdateSpeechAnnotationDto } from './dto/update-speech-annotation.dto'
import { SpeechTemplateService } from './speech-template.service'

@Injectable()
export class SpeechAnnotationService {
  constructor(
    @InjectRepository(SpeechAnnotation)
    private readonly annotationRepo: Repository<SpeechAnnotation>,
    private readonly templateService: SpeechTemplateService,
  ) {}

  async findByCallRecord(callRecordId: number) {
    return this.annotationRepo.find({
      where: { callRecordId },
      relations: ['template'],
      order: { startTime: 'ASC' },
    })
  }

  async create(dto: CreateSpeechAnnotationDto, userId: number) {
    const entity = this.annotationRepo.create({
      ...dto,
      templateId: dto.templateId ?? null,
      comment: dto.comment ?? null,
      score: dto.score ?? null,
      annotatedBy: userId,
    })
    const saved = await this.annotationRepo.save(entity)
    if (dto.templateId) {
      await this.templateService.incrementUsageCount(dto.templateId)
    }
    return saved
  }

  async update(id: number, dto: UpdateSpeechAnnotationDto) {
    const annotation = await this.annotationRepo.findOne({ where: { id } })
    if (!annotation) throw new NotFoundException('标注不存在')
    Object.assign(annotation, dto)
    return this.annotationRepo.save(annotation)
  }

  async remove(id: number) {
    const annotation = await this.annotationRepo.findOne({ where: { id } })
    if (!annotation) throw new NotFoundException('标注不存在')
    return this.annotationRepo.softRemove(annotation)
  }
}
