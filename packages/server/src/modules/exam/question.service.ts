import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Question } from './entities/question.entity'
import { CreateQuestionDto } from './dto/create-question.dto'
import { UpdateQuestionDto } from './dto/update-question.dto'
import { QuestionQueryDto } from './dto/question-query.dto'
import type { RandomPaperConfig } from '@crm/shared'

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(Question)
    private readonly repo: Repository<Question>,
  ) {}

  async findAll(query: QuestionQueryDto) {
    const { page = 1, pageSize = 20, keyword, categoryId, type, difficulty } = query
    const qb = this.repo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.category', 'category')
      .orderBy('q.createdAt', 'DESC')

    if (keyword) {
      qb.andWhere('q.content LIKE :kw', { kw: `%${keyword}%` })
    }
    if (categoryId) {
      qb.andWhere('q.categoryId = :categoryId', { categoryId })
    }
    if (type) {
      qb.andWhere('q.type = :type', { type })
    }
    if (difficulty) {
      qb.andWhere('q.difficulty = :difficulty', { difficulty })
    }

    qb.skip((page - 1) * pageSize).take(pageSize)
    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<Question> {
    const q = await this.repo.findOne({ where: { id }, relations: ['category'] })
    if (!q) throw new NotFoundException('题目不存在')
    return q
  }

  async create(dto: CreateQuestionDto, userId: number): Promise<Question> {
    const entity = this.repo.create({
      ...dto,
      createdById: userId,
    })
    return this.repo.save(entity)
  }

  async update(id: number, dto: UpdateQuestionDto): Promise<Question> {
    const question = await this.findOne(id)
    Object.assign(question, dto)
    return this.repo.save(question)
  }

  async remove(id: number): Promise<Question> {
    const question = await this.findOne(id)
    return this.repo.softRemove(question)
  }

  async getRandomQuestions(
    config: RandomPaperConfig,
  ): Promise<Array<{ question: Question; score: number }>> {
    const result: Array<{ question: Question; score: number }> = []
    for (const rule of config.rules) {
      const questions = await this.repo
        .createQueryBuilder('q')
        .where('q.categoryId = :categoryId', { categoryId: rule.categoryId })
        .andWhere('q.type = :type', { type: rule.type })
        .orderBy('RAND()')
        .take(rule.count)
        .getMany()
      for (const q of questions) {
        result.push({ question: q, score: rule.scorePerQuestion })
      }
    }
    return result
  }

  async updateCorrectRate(
    questionId: number,
    correctCount: number,
    totalCount: number,
  ): Promise<void> {
    if (totalCount === 0) return
    const rate = Number(((correctCount / totalCount) * 100).toFixed(2))
    await this.repo.update(questionId, { correctRate: rate })
  }
}
