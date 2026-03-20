import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ExamPaper } from './entities/exam-paper.entity'
import { ExamPaperQuestion } from './entities/exam-paper-question.entity'
import { CreateExamPaperDto } from './dto/create-exam-paper.dto'

@Injectable()
export class ExamPaperService {
  constructor(
    @InjectRepository(ExamPaper)
    private readonly paperRepo: Repository<ExamPaper>,
    @InjectRepository(ExamPaperQuestion)
    private readonly pqRepo: Repository<ExamPaperQuestion>,
  ) {}

  async create(dto: CreateExamPaperDto, userId: number): Promise<ExamPaper> {
    const paper = this.paperRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      buildMode: dto.buildMode,
      totalScore: dto.totalScore,
      passScore: dto.passScore,
      duration: dto.duration,
      createdById: userId,
      randomConfig:
        dto.buildMode === 'random' && dto.randomConfig ? { rules: dto.randomConfig } : null,
    })
    const saved = await this.paperRepo.save(paper)

    if (dto.buildMode === 'manual' && dto.questions?.length) {
      const pqs = dto.questions.map((q, idx) =>
        this.pqRepo.create({
          paperId: saved.id,
          questionId: q.questionId,
          score: q.score,
          sortOrder: q.sortOrder ?? idx,
        }),
      )
      await this.pqRepo.save(pqs)
    }

    return saved
  }

  async findAll(page = 1, pageSize = 20) {
    const qb = this.paperRepo
      .createQueryBuilder('p')
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<ExamPaper & { questions: ExamPaperQuestion[] }> {
    const paper = await this.paperRepo.findOne({ where: { id } })
    if (!paper) throw new NotFoundException('试卷不存在')
    const questions = await this.pqRepo.find({
      where: { paperId: id },
      relations: ['question'],
      order: { sortOrder: 'ASC' },
    })
    return Object.assign(paper, { questions })
  }

  async remove(id: number): Promise<ExamPaper> {
    const paper = await this.paperRepo.findOne({ where: { id } })
    if (!paper) throw new NotFoundException('试卷不存在')
    await this.pqRepo.delete({ paperId: id })
    return this.paperRepo.softRemove(paper)
  }
}
