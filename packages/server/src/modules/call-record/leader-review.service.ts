import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { LeaderReview } from './entities/leader-review.entity'

@Injectable()
export class LeaderReviewService {
  private readonly logger = new Logger(LeaderReviewService.name)

  constructor(
    @InjectRepository(LeaderReview)
    private readonly reviewRepo: Repository<LeaderReview>,
  ) {}

  async create(data: {
    callRecordId: number
    customerId?: number
    reviewerId: number
    content: string
  }): Promise<LeaderReview> {
    const review = this.reviewRepo.create({
      callRecordId: data.callRecordId,
      customerId: data.customerId ?? null,
      reviewerId: data.reviewerId,
      content: data.content,
    })
    return this.reviewRepo.save(review)
  }

  async findByCallRecord(callRecordId: number): Promise<LeaderReview[]> {
    return this.reviewRepo.find({
      where: { callRecordId },
      order: { createdAt: 'DESC' },
    })
  }

  async findByCustomer(
    customerId: number,
    page = 1,
    pageSize = 20,
  ): Promise<{ list: LeaderReview[]; total: number }> {
    const [list, total] = await this.reviewRepo.findAndCount({
      where: { customerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    return { list, total }
  }

  async remove(id: number): Promise<void> {
    const review = await this.reviewRepo.findOne({ where: { id } })
    if (!review) throw new NotFoundException(`点评 #${id} 不存在`)
    await this.reviewRepo.softRemove(review)
  }
}
