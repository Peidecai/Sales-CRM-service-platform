import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Cron } from '@nestjs/schedule'
import { Todo } from './entities/todo.entity'
import { CreateTodoDto } from './dto/create-todo.dto'
import { UpdateTodoDto } from './dto/update-todo.dto'
import { QueryTodoDto } from './dto/query-todo.dto'
import { TodoStatus, TodoCategory, TodoPriority } from '@crm/shared'
import { NotificationService } from '../notification/notification.service'
import { NotificationType } from '../notification/notification.types'

@Injectable()
export class TodoService {
  private readonly logger = new Logger(TodoService.name)

  constructor(
    @InjectRepository(Todo)
    private readonly todoRepository: Repository<Todo>,
    private readonly notificationService: NotificationService,
  ) {}

  async create(userId: number, dto: CreateTodoDto): Promise<Todo> {
    const entity = this.todoRepository.create({
      userId,
      title: dto.title,
      description: dto.description ?? null,
      category: dto.category ?? TodoCategory.OTHER,
      priority: dto.priority ?? TodoPriority.MEDIUM,
      status: TodoStatus.PENDING,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      relatedType: dto.relatedType ?? null,
      relatedId: dto.relatedId ?? null,
    })
    return this.todoRepository.save(entity)
  }

  async findAll(userId: number, query: QueryTodoDto): Promise<{ list: Todo[]; total: number }> {
    const { page = 1, pageSize = 20, status, priority, category } = query
    const qb = this.todoRepository.createQueryBuilder('t').where('t.userId = :userId', { userId })

    if (status) qb.andWhere('t.status = :status', { status })
    if (priority) qb.andWhere('t.priority = :priority', { priority })
    if (category) qb.andWhere('t.category = :category', { category })

    qb.orderBy('CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END', 'ASC')
      .addOrderBy('t.dueDate', 'ASC')
      .addOrderBy('t.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }

  async findOne(id: number, userId: number): Promise<Todo> {
    const todo = await this.todoRepository.findOne({ where: { id, userId } })
    if (!todo) throw new NotFoundException(`Todo ${id} not found`)
    return todo
  }

  async update(id: number, userId: number, dto: UpdateTodoDto): Promise<Todo> {
    const todo = await this.findOne(id, userId)
    if (dto.title !== undefined) todo.title = dto.title
    if (dto.description !== undefined) todo.description = dto.description ?? null
    if (dto.category !== undefined) todo.category = dto.category
    if (dto.priority !== undefined) todo.priority = dto.priority
    if (dto.dueDate !== undefined) todo.dueDate = dto.dueDate ? new Date(dto.dueDate) : null
    return this.todoRepository.save(todo)
  }

  async complete(id: number, userId: number): Promise<Todo> {
    const todo = await this.findOne(id, userId)
    todo.status = TodoStatus.COMPLETED
    todo.completedAt = new Date()
    return this.todoRepository.save(todo)
  }

  async cancel(id: number, userId: number): Promise<Todo> {
    const todo = await this.findOne(id, userId)
    todo.status = TodoStatus.CANCELLED
    return this.todoRepository.save(todo)
  }

  async getOverdueCount(userId: number): Promise<number> {
    return this.todoRepository.count({
      where: { userId, status: TodoStatus.OVERDUE },
    })
  }

  /** Create a system-generated todo (e.g. from follow-up reminders) */
  async createSystemTodo(params: {
    userId: number
    title: string
    description?: string
    category?: TodoCategory
    priority?: TodoPriority
    dueDate?: Date
    relatedType?: string
    relatedId?: number
  }): Promise<Todo> {
    const entity = this.todoRepository.create({
      userId: params.userId,
      title: params.title,
      description: params.description ?? null,
      category: params.category ?? TodoCategory.OTHER,
      priority: params.priority ?? TodoPriority.MEDIUM,
      status: TodoStatus.PENDING,
      dueDate: params.dueDate ?? null,
      relatedType: params.relatedType ?? null,
      relatedId: params.relatedId ?? null,
    })
    return this.todoRepository.save(entity)
  }

  /** Daily cron at 08:00 to mark overdue todos */
  @Cron('0 8 * * *')
  async checkOverdueTodos(): Promise<void> {
    const now = new Date()
    const result = await this.todoRepository
      .createQueryBuilder()
      .update(Todo)
      .set({ status: TodoStatus.OVERDUE })
      .where('status = :status', { status: TodoStatus.PENDING })
      .andWhere('due_date < :now', { now })
      .execute()
    if (result.affected && result.affected > 0) {
      this.logger.log(`Marked ${result.affected} todos as overdue`)
      // Notify affected users
      const overdueTodos = await this.todoRepository.find({
        where: { status: TodoStatus.OVERDUE },
        select: ['userId'],
      })
      const userIds = [...new Set(overdueTodos.map((t) => t.userId))]
      for (const uid of userIds) {
        this.notificationService.notifyUser(uid, {
          type: NotificationType.FOLLOW_UP_OVERDUE,
          actorId: 0,
          actorName: '系统',
          resource: 'todo',
          resourceId: 0,
          message: '您有待办事项已逾期，请及时处理',
        })
      }
    }
  }
}
