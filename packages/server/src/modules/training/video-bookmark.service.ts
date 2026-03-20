import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { VideoBookmark } from './entities/video-bookmark.entity'
import { CreateBookmarkDto } from './dto/misc.dto'

@Injectable()
export class VideoBookmarkService {
  constructor(
    @InjectRepository(VideoBookmark)
    private readonly bookmarkRepo: Repository<VideoBookmark>,
  ) {}

  async findByUserAndVideo(userId: number, videoId: number): Promise<VideoBookmark[]> {
    return this.bookmarkRepo.find({
      where: { userId, videoId },
      order: { timestamp: 'ASC' },
    })
  }

  async create(userId: number, videoId: number, dto: CreateBookmarkDto): Promise<VideoBookmark> {
    const entity = this.bookmarkRepo.create({ userId, videoId, ...dto })
    return this.bookmarkRepo.save(entity)
  }

  async remove(id: number, userId: number): Promise<void> {
    const bookmark = await this.bookmarkRepo.findOne({ where: { id, userId } })
    if (!bookmark) throw new NotFoundException(`Bookmark #${id} not found`)
    await this.bookmarkRepo.softRemove(bookmark)
  }
}
