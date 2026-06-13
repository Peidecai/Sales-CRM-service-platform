import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CampaignTask, CampaignTaskStatus } from './entities/campaign-task.entity'
import { CampaignCallItem, CampaignCallStatus } from './entities/campaign-call-item.entity'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

@Injectable()
export class CampaignService {
  constructor(
    @InjectRepository(CampaignTask)
    private readonly taskRepository: Repository<CampaignTask>,
    @InjectRepository(CampaignCallItem)
    private readonly itemRepository: Repository<CampaignCallItem>,
  ) {}

  async create(
    dto: { name: string; customerIds?: number[] },
    user: AuthUser,
  ): Promise<CampaignTask> {
    const task = this.taskRepository.create({
      name: dto.name,
      status: CampaignTaskStatus.DRAFT,
      totalCount: dto.customerIds?.length ?? 0,
      createdBy: user.id,
    })
    const saved = await this.taskRepository.save(task)
    if (dto.customerIds?.length) {
      for (const cid of dto.customerIds) {
        await this.itemRepository.save(
          this.itemRepository.create({
            campaignTaskId: saved.id,
            customerId: cid,
            phone: '',
            callStatus: CampaignCallStatus.PENDING,
          }),
        )
      }
    }
    return saved
  }

  async findAll(query: { status?: string; page?: number; pageSize?: number }, user: AuthUser) {
    const { status, page = 1, pageSize = 20 } = query
    const qb = this.taskRepository
      .createQueryBuilder('t')
      .where('t.createdBy = :uid', { uid: user.id })
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
    if (status) qb.andWhere('t.status = :status', { status })
    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number, user: AuthUser): Promise<CampaignTask> {
    const task = await this.taskRepository.findOne({ where: { id } })
    if (!task) throw new NotFoundException('Campaign not found')
    if (task.createdBy !== user.id) throw new BadRequestException('No permission')
    return task
  }

  async start(id: number, user: AuthUser): Promise<void> {
    const task = await this.findOne(id, user)
    if (task.status !== CampaignTaskStatus.DRAFT && task.status !== CampaignTaskStatus.PAUSED) {
      throw new BadRequestException('Invalid state to start')
    }
    task.status = CampaignTaskStatus.RUNNING
    task.startedAt = task.startedAt ?? new Date()
    await this.taskRepository.save(task)
  }

  async pause(id: number, user: AuthUser): Promise<void> {
    const task = await this.findOne(id, user)
    if (task.status !== CampaignTaskStatus.RUNNING) throw new BadRequestException('Not running')
    task.status = CampaignTaskStatus.PAUSED
    await this.taskRepository.save(task)
  }

  async resume(id: number, user: AuthUser): Promise<void> {
    const task = await this.findOne(id, user)
    if (task.status !== CampaignTaskStatus.PAUSED) throw new BadRequestException('Not paused')
    task.status = CampaignTaskStatus.RUNNING
    await this.taskRepository.save(task)
  }

  async stop(id: number, user: AuthUser): Promise<void> {
    const task = await this.findOne(id, user)
    task.status = CampaignTaskStatus.COMPLETED
    task.endedAt = new Date()
    await this.taskRepository.save(task)
  }

  async update(id: number, dto: { name?: string }, user: AuthUser): Promise<CampaignTask> {
    const task = await this.findOne(id, user)
    if (task.status !== CampaignTaskStatus.DRAFT) {
      throw new BadRequestException('Only draft can be edited')
    }
    if (dto.name) task.name = dto.name
    return this.taskRepository.save(task)
  }

  async remove(id: number, user: AuthUser): Promise<void> {
    const task = await this.findOne(id, user)
    if (task.status !== CampaignTaskStatus.DRAFT && task.status !== CampaignTaskStatus.CANCELLED) {
      throw new BadRequestException('Only draft or cancelled can be deleted')
    }
    await this.taskRepository.remove(task)
  }

  async getItems(campaignId: number, page: number, pageSize: number, user: AuthUser) {
    await this.findOne(campaignId, user)
    const [list, total] = await this.itemRepository.findAndCount({
      where: { campaignTaskId: campaignId },
      order: { id: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    return { list, total, page, pageSize }
  }
}
