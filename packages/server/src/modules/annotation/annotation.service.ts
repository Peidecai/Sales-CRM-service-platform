import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Annotation } from './entities/annotation.entity'
import { CreateAnnotationDto } from './dto/create-annotation.dto'
import { UpdateAnnotationDto } from './dto/update-annotation.dto'
import { QueryAnnotationDto } from './dto/query-annotation.dto'
import { AuthUser } from '../../common/decorators/current-user.decorator'

@Injectable()
export class AnnotationService {
  constructor(
    @InjectRepository(Annotation)
    private readonly annotationRepository: Repository<Annotation>,
  ) {}

  async create(userId: number, dto: CreateAnnotationDto): Promise<Annotation> {
    const entity = this.annotationRepository.create({
      userId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      content: dto.content,
      pageX: dto.pageX ?? null,
      pageY: dto.pageY ?? null,
      resolved: false,
    })
    return this.annotationRepository.save(entity)
  }

  async findAll(
    query: QueryAnnotationDto,
    user?: AuthUser,
  ): Promise<{ list: Annotation[]; total: number }> {
    const { page = 1, pageSize = 20, targetType, targetId, resolved } = query
    const qb = this.annotationRepository.createQueryBuilder('a')

    if (targetType) qb.andWhere('a.targetType = :targetType', { targetType })
    if (targetId !== undefined) qb.andWhere('a.targetId = :targetId', { targetId })
    if (resolved !== undefined) qb.andWhere('a.resolved = :resolved', { resolved })

    // SALES users can only see their own annotations
    if (user?.role === 'sales') {
      qb.andWhere('a.userId = :userId', { userId: user.id })
    }

    qb.orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }

  async findOne(id: number): Promise<Annotation> {
    const annotation = await this.annotationRepository.findOne({ where: { id } })
    if (!annotation) throw new NotFoundException(`Annotation ${id} not found`)
    return annotation
  }

  async update(id: number, userId: number, dto: UpdateAnnotationDto): Promise<Annotation> {
    const annotation = await this.findOne(id)
    if (annotation.userId !== userId)
      throw new ForbiddenException('Cannot update others annotation')
    if (dto.content !== undefined) annotation.content = dto.content
    return this.annotationRepository.save(annotation)
  }

  async resolve(id: number, resolvedById: number): Promise<Annotation> {
    const annotation = await this.findOne(id)
    annotation.resolved = true
    annotation.resolvedById = resolvedById
    annotation.resolvedAt = new Date()
    return this.annotationRepository.save(annotation)
  }

  async getByTarget(targetType: string, targetId: number): Promise<Annotation[]> {
    return this.annotationRepository.find({
      where: { targetType: targetType as Annotation['targetType'], targetId },
      order: { createdAt: 'DESC' },
    })
  }

  async getMyAnnotations(
    userId: number,
    page = 1,
    pageSize = 20,
  ): Promise<{ list: Annotation[]; total: number }> {
    const [list, total] = await this.annotationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    return { list, total }
  }

  async remove(id: number, userId: number): Promise<void> {
    const annotation = await this.findOne(id)
    if (annotation.userId !== userId)
      throw new ForbiddenException('Cannot delete others annotation')
    await this.annotationRepository.softRemove(annotation)
  }
}
