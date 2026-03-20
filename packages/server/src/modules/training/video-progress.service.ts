import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { VideoProgress } from './entities/video-progress.entity'
import { TrainingVideo } from './entities/training-video.entity'
import { UpdateProgressDto } from './dto/misc.dto'

@Injectable()
export class VideoProgressService {
  constructor(
    @InjectRepository(VideoProgress)
    private readonly progressRepo: Repository<VideoProgress>,
    @InjectRepository(TrainingVideo)
    private readonly videoRepo: Repository<TrainingVideo>,
  ) {}

  async getProgress(userId: number, videoId: number): Promise<VideoProgress | null> {
    return this.progressRepo.findOne({ where: { userId, videoId } })
  }

  async updateProgress(
    userId: number,
    videoId: number,
    dto: UpdateProgressDto,
  ): Promise<VideoProgress> {
    const video = await this.videoRepo.findOne({ where: { id: videoId } })
    if (!video) {
      throw new Error(`Video #${videoId} not found`)
    }

    let progress = await this.progressRepo.findOne({ where: { userId, videoId } })
    if (!progress) {
      progress = this.progressRepo.create({ userId, videoId })
    }

    progress.watchedSeconds = dto.watchedSeconds
    progress.lastPosition = dto.lastPosition

    // Calculate completion rate
    const rate = video.duration > 0 ? (dto.watchedSeconds / video.duration) * 100 : 0
    progress.completionRate = Math.min(100, Math.round(rate * 100) / 100)

    // Auto-mark completed at >= 90%
    if (progress.completionRate >= 90 && !progress.isCompleted) {
      progress.isCompleted = true
      progress.completedAt = new Date()
    }

    return this.progressRepo.save(progress)
  }

  async getUserStats(userId: number): Promise<{ totalWatchTime: number; completedCount: number }> {
    const records = await this.progressRepo.find({ where: { userId } })
    const totalWatchTime = records.reduce((sum, r) => sum + r.watchedSeconds, 0)
    const completedCount = records.filter((r) => r.isCompleted).length
    return { totalWatchTime, completedCount }
  }
}
