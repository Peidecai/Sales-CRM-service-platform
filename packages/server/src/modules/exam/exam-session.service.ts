import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ExamSession } from './entities/exam-session.entity'
import { ExamPaperQuestion } from './entities/exam-paper-question.entity'
import { ExamPaper } from './entities/exam-paper.entity'
import { Question } from './entities/question.entity'
import { QuestionService } from './question.service'
import { SubmitExamDto } from './dto/submit-exam.dto'
import { ExamStatisticsQueryDto } from './dto/exam-statistics-query.dto'
import { ExamSessionStatus, QuestionType } from '@crm/shared'
import type { ExamAnswer } from '@crm/shared'

@Injectable()
export class ExamSessionService {
  constructor(
    @InjectRepository(ExamSession)
    private readonly sessionRepo: Repository<ExamSession>,
    @InjectRepository(ExamPaper)
    private readonly paperRepo: Repository<ExamPaper>,
    @InjectRepository(ExamPaperQuestion)
    private readonly pqRepo: Repository<ExamPaperQuestion>,
    private readonly questionService: QuestionService,
  ) {}

  async start(paperId: number, userId: number): Promise<ExamSession> {
    const paper = await this.paperRepo.findOne({ where: { id: paperId } })
    if (!paper) throw new NotFoundException('试卷不存在')

    // Count previous attempts
    const attemptCount = await this.sessionRepo.count({
      where: { paperId, userId },
    })

    // For random mode, generate questions now
    if (paper.buildMode === 'random' && paper.randomConfig) {
      const randomQuestions = await this.questionService.getRandomQuestions(paper.randomConfig)
      // Save generated paper questions
      for (let i = 0; i < randomQuestions.length; i++) {
        const existing = await this.pqRepo.findOne({
          where: { paperId, questionId: randomQuestions[i].question.id },
        })
        if (!existing) {
          await this.pqRepo.save(
            this.pqRepo.create({
              paperId,
              questionId: randomQuestions[i].question.id,
              score: randomQuestions[i].score,
              sortOrder: i,
            }),
          )
        }
      }
    }

    const session = this.sessionRepo.create({
      paperId,
      userId,
      status: ExamSessionStatus.IN_PROGRESS,
      startedAt: new Date(),
      attemptNo: attemptCount + 1,
    })
    return this.sessionRepo.save(session)
  }

  async submit(sessionId: number, dto: SubmitExamDto, userId: number): Promise<ExamSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId },
    })
    if (!session) throw new NotFoundException('考试记录不存在')
    if (session.status !== ExamSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('考试已提交或未开始')
    }

    // Get paper questions with correct answers
    const paperQuestions = await this.pqRepo.find({
      where: { paperId: session.paperId },
      relations: ['question'],
    })
    const pqMap = new Map(paperQuestions.map((pq) => [pq.questionId, pq]))

    const paper = await this.paperRepo.findOne({ where: { id: session.paperId } })
    if (!paper) throw new NotFoundException('试卷不存在')

    let totalScore = 0
    const answers: ExamAnswer[] = dto.answers.map((a) => {
      const pq = pqMap.get(a.questionId)
      if (!pq)
        return { questionId: a.questionId, userAnswer: a.userAnswer, isCorrect: false, score: 0 }

      const question = pq.question
      const { isCorrect, scoreRatio } = this.gradeAnswer(question, a.userAnswer)
      const earnedScore = Math.round(pq.score * scoreRatio)
      totalScore += earnedScore

      return {
        questionId: a.questionId,
        userAnswer: a.userAnswer,
        isCorrect,
        score: earnedScore,
      }
    })

    session.answers = answers
    session.totalScore = totalScore
    session.passed = totalScore >= paper.passScore
    session.status = ExamSessionStatus.GRADED
    session.submittedAt = new Date()

    return this.sessionRepo.save(session)
  }

  gradeAnswer(
    question: Question,
    userAnswer: string[],
  ): { isCorrect: boolean; scoreRatio: number } {
    const correctAnswer = question.answer

    switch (question.type) {
      case QuestionType.SINGLE_CHOICE:
      case QuestionType.TRUE_FALSE:
      case QuestionType.FILL_BLANK: {
        const isCorrect =
          userAnswer.length === correctAnswer.length &&
          userAnswer.every((a, i) => a === correctAnswer[i])
        return { isCorrect, scoreRatio: isCorrect ? 1 : 0 }
      }
      case QuestionType.MULTI_CHOICE: {
        const correctSet = new Set(correctAnswer)
        const userSet = new Set(userAnswer)
        // Check for wrong selections
        const hasWrong = userAnswer.some((a) => !correctSet.has(a))
        if (hasWrong) return { isCorrect: false, scoreRatio: 0 }
        // Full or partial
        if (userSet.size === correctSet.size) return { isCorrect: true, scoreRatio: 1 }
        // Partial credit — at least one correct, no wrong
        if (userSet.size > 0) return { isCorrect: false, scoreRatio: 0.5 }
        return { isCorrect: false, scoreRatio: 0 }
      }
      default:
        return { isCorrect: false, scoreRatio: 0 }
    }
  }

  async getResult(
    sessionId: number,
  ): Promise<ExamSession & { paperQuestions: ExamPaperQuestion[] }> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['paper'],
    })
    if (!session) throw new NotFoundException('考试记录不存在')

    const paperQuestions = await this.pqRepo.find({
      where: { paperId: session.paperId },
      relations: ['question', 'question.category'],
      order: { sortOrder: 'ASC' },
    })

    return Object.assign(session, { paperQuestions })
  }

  async getMyHistory(userId: number, page = 1, pageSize = 20) {
    const qb = this.sessionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.paper', 'paper')
      .where('s.userId = :userId', { userId })
      .orderBy('s.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async getStatistics(query: ExamStatisticsQueryDto) {
    const qb = this.sessionRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: ExamSessionStatus.GRADED })

    if (query.paperId) {
      qb.andWhere('s.paperId = :paperId', { paperId: query.paperId })
    }
    if (query.startDate) {
      qb.andWhere('s.submittedAt >= :startDate', { startDate: query.startDate })
    }
    if (query.endDate) {
      qb.andWhere('s.submittedAt <= :endDate', { endDate: query.endDate })
    }

    const sessions = await qb.getMany()

    const totalCount = sessions.length
    if (totalCount === 0) {
      return {
        totalCount: 0,
        passRate: 0,
        avgScore: 0,
        scoreDistribution: { '0-60': 0, '60-70': 0, '70-80': 0, '80-90': 0, '90-100': 0 },
        topWrongQuestions: [],
      }
    }

    const passCount = sessions.filter((s) => s.passed).length
    const passRate = Number(((passCount / totalCount) * 100).toFixed(2))
    const avgScore = Number(
      (sessions.reduce((sum, s) => sum + (s.totalScore ?? 0), 0) / totalCount).toFixed(2),
    )

    const dist = { '0-60': 0, '60-70': 0, '70-80': 0, '80-90': 0, '90-100': 0 }
    for (const s of sessions) {
      const score = s.totalScore ?? 0
      if (score < 60) dist['0-60']++
      else if (score < 70) dist['60-70']++
      else if (score < 80) dist['70-80']++
      else if (score < 90) dist['80-90']++
      else dist['90-100']++
    }

    // Top wrong questions
    const wrongMap = new Map<number, { questionId: number; wrongCount: number }>()
    for (const s of sessions) {
      if (!s.answers) continue
      for (const a of s.answers) {
        if (!a.isCorrect) {
          const entry = wrongMap.get(a.questionId) ?? { questionId: a.questionId, wrongCount: 0 }
          entry.wrongCount++
          wrongMap.set(a.questionId, entry)
        }
      }
    }
    const topWrongQuestions = Array.from(wrongMap.values())
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .slice(0, 10)

    return { totalCount, passRate, avgScore, scoreDistribution: dist, topWrongQuestions }
  }
}
