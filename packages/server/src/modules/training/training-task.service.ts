import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { TrainingTask } from './entities/training-task.entity'
import { TrainingTaskAssignee } from './entities/training-task-assignee.entity'
import { CreateTrainingTaskDto } from './dto/misc.dto'

@Injectable()
export class TrainingTaskService {
  constructor(
    @InjectRepository(TrainingTask)
    private readonly taskRepo: Repository<TrainingTask>,
    @InjectRepository(TrainingTaskAssignee)
    private readonly assigneeRepo: Repository<TrainingTaskAssignee>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTrainingTaskDto, assignedById: number): Promise<TrainingTask> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const task = queryRunner.manager.create(TrainingTask, {
        title: dto.title,
        description: dto.description,
        videoId: dto.videoId,
        assignedById,
        deadline: dto.deadline,
      })
      const saved = await queryRunner.manager.save(task)

      const assignees = dto.assigneeIds.map((userId) =>
        queryRunner.manager.create(TrainingTaskAssignee, {
          taskId: saved.id,
          userId,
        }),
      )
      await queryRunner.manager.save(assignees)
      await queryRunner.commitTransaction()

      return this.findOne(saved.id)
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  async findAll(query: { userId?: number; page?: number; pageSize?: number }) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20

    const qb = this.taskRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.video', 'video')
      .leftJoinAndSelect('t.assignees', 'assignees')

    if (query.userId) {
      qb.andWhere('assignees.user_id = :userId', { userId: query.userId })
    }

    qb.orderBy('t.deadline', 'ASC')
    qb.skip((page - 1) * pageSize).take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<TrainingTask> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['video', 'assignees'],
    })
    if (!task) throw new NotFoundException(`Training task #${id} not found`)
    return task
  }

  async markComplete(taskId: number, userId: number): Promise<TrainingTaskAssignee> {
    const assignee = await this.assigneeRepo.findOne({
      where: { taskId, userId },
    })
    if (!assignee) throw new NotFoundException(`Task assignee not found`)
    assignee.isCompleted = true
    assignee.completedAt = new Date()
    return this.assigneeRepo.save(assignee)
  }

  async getStatistics(): Promise<{
    totalTasks: number
    completionRate: number
    overdueTasks: number
  }> {
    const totalTasks = await this.taskRepo.count()
    const allAssignees = await this.assigneeRepo.find()
    const completedCount = allAssignees.filter((a) => a.isCompleted).length
    const completionRate =
      allAssignees.length > 0 ? Math.round((completedCount / allAssignees.length) * 10000) / 100 : 0

    const now = new Date()
    const overdueTasks = await this.taskRepo
      .createQueryBuilder('t')
      .leftJoin('t.assignees', 'a')
      .where('t.deadline < :now', { now })
      .andWhere('a.is_completed = 0')
      .getCount()

    return { totalTasks, completionRate, overdueTasks }
  }
}
