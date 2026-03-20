import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { QuestionCategory } from './entities/question-category.entity'
import { Question } from './entities/question.entity'
import { ExamPaper } from './entities/exam-paper.entity'
import { ExamPaperQuestion } from './entities/exam-paper-question.entity'
import { ExamSession } from './entities/exam-session.entity'
import {
  QuestionCategoryController,
  QuestionController,
  ExamPaperController,
  ExamSessionController,
  ExamStatisticsController,
} from './exam.controller'
import { QuestionCategoryService } from './question-category.service'
import { QuestionService } from './question.service'
import { ExamPaperService } from './exam-paper.service'
import { ExamSessionService } from './exam-session.service'
import { UserModule } from '../user/user.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionCategory,
      Question,
      ExamPaper,
      ExamPaperQuestion,
      ExamSession,
    ]),
    UserModule,
  ],
  controllers: [
    QuestionCategoryController,
    QuestionController,
    ExamPaperController,
    ExamSessionController,
    ExamStatisticsController,
  ],
  providers: [QuestionCategoryService, QuestionService, ExamPaperService, ExamSessionService],
  exports: [QuestionService, ExamPaperService, ExamSessionService, TypeOrmModule],
})
export class ExamModule {}
