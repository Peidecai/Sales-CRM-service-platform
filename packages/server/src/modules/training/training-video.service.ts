import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TrainingVideo } from './entities/training-video.entity'
import { VideoChapter } from './entities/video-chapter.entity'
import {
  CreateTrainingVideoDto,
  UpdateTrainingVideoDto,
  QueryVideoDto,
} from './dto/training-video.dto'
import { CreateChapterDto, UpdateChapterDto } from './dto/misc.dto'

@Injectable()
export class TrainingVideoService {
  constructor(
    @InjectRepository(TrainingVideo)
    private readonly videoRepo: Repository<TrainingVideo>,
    @InjectRepository(VideoChapter)
    private readonly chapterRepo: Repository<VideoChapter>,
  ) {}

  async findAll(query: QueryVideoDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const qb = this.videoRepo.createQueryBuilder('v').leftJoinAndSelect('v.category', 'category')

    if (query.categoryId) {
      qb.andWhere('v.category_id = :categoryId', { categoryId: query.categoryId })
    }
    if (query.isPublished !== undefined) {
      qb.andWhere('v.is_published = :isPublished', { isPublished: query.isPublished })
    }
    if (query.keyword) {
      qb.andWhere('(v.title LIKE :kw OR v.description LIKE :kw)', { kw: `%${query.keyword}%` })
    }

    qb.orderBy('v.sort_order', 'ASC').addOrderBy('v.created_at', 'DESC')
    qb.skip((page - 1) * pageSize).take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<TrainingVideo> {
    const video = await this.videoRepo.findOne({
      where: { id },
      relations: ['category', 'chapters'],
    })
    if (!video) throw new NotFoundException(`Training video #${id} not found`)
    return video
  }

  async create(dto: CreateTrainingVideoDto, uploadedById: number): Promise<TrainingVideo> {
    const entity = this.videoRepo.create({ ...dto, uploadedById })
    return this.videoRepo.save(entity)
  }

  async update(id: number, dto: UpdateTrainingVideoDto): Promise<TrainingVideo> {
    const video = await this.findOne(id)
    Object.assign(video, dto)
    return this.videoRepo.save(video)
  }

  async remove(id: number): Promise<void> {
    const video = await this.findOne(id)
    await this.videoRepo.softRemove(video)
  }

  async togglePublish(id: number): Promise<TrainingVideo> {
    const video = await this.findOne(id)
    video.isPublished = !video.isPublished
    return this.videoRepo.save(video)
  }

  // --- Chapters ---

  async findChapters(videoId: number): Promise<VideoChapter[]> {
    return this.chapterRepo.find({
      where: { videoId },
      order: { sortOrder: 'ASC', startTime: 'ASC' },
    })
  }

  async createChapter(videoId: number, dto: CreateChapterDto): Promise<VideoChapter> {
    await this.findOne(videoId) // ensure video exists
    const entity = this.chapterRepo.create({ ...dto, videoId })
    return this.chapterRepo.save(entity)
  }

  async updateChapter(chapterId: number, dto: UpdateChapterDto): Promise<VideoChapter> {
    const chapter = await this.chapterRepo.findOne({ where: { id: chapterId } })
    if (!chapter) throw new NotFoundException(`Chapter #${chapterId} not found`)
    Object.assign(chapter, dto)
    return this.chapterRepo.save(chapter)
  }

  async removeChapter(chapterId: number): Promise<void> {
    const chapter = await this.chapterRepo.findOne({ where: { id: chapterId } })
    if (!chapter) throw new NotFoundException(`Chapter #${chapterId} not found`)
    await this.chapterRepo.softRemove(chapter)
  }
}
