import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { QuestionCategoryService } from './question-category.service'
import { QuestionService } from './question.service'
import { ExamPaperService } from './exam-paper.service'
import { ExamSessionService } from './exam-session.service'
import { CreateQuestionCategoryDto } from './dto/create-question-category.dto'
import { CreateQuestionDto } from './dto/create-question.dto'
import { UpdateQuestionDto } from './dto/update-question.dto'
import { QuestionQueryDto } from './dto/question-query.dto'
import { CreateExamPaperDto } from './dto/create-exam-paper.dto'
import { StartExamDto } from './dto/start-exam.dto'
import { SubmitExamDto } from './dto/submit-exam.dto'
import { ExamStatisticsQueryDto } from './dto/exam-statistics-query.dto'

/* ==================== Question Categories ==================== */

@ApiTags('题目分类')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('exam/question-categories')
export class QuestionCategoryController {
  constructor(private readonly service: QuestionCategoryService) {}

  @Get()
  @ApiOperation({ summary: '题目分类树' })
  async getTree() {
    return this.service.getTree()
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '创建题目分类' })
  async create(@Body() dto: CreateQuestionCategoryDto) {
    return this.service.create(dto)
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '更新题目分类' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateQuestionCategoryDto>,
  ) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '删除题目分类' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}

/* ==================== Questions ==================== */

@ApiTags('题库')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('exam/questions')
export class QuestionController {
  constructor(private readonly service: QuestionService) {}

  @Get()
  @ApiOperation({ summary: '题目列表' })
  async findAll(@Query() query: QuestionQueryDto) {
    return this.service.findAll(query)
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '创建题目' })
  async create(@Body() dto: CreateQuestionDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id)
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '批量导入题目' })
  async importBatch(@Body() dtos: CreateQuestionDto[], @CurrentUser() user: AuthUser) {
    const results: unknown[] = []
    for (const dto of dtos) {
      results.push(await this.service.create(dto, user.id))
    }
    return results
  }

  @Get(':id')
  @ApiOperation({ summary: '题目详情' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '更新题目' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuestionDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '删除题目' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}

/* ==================== Exam Papers ==================== */

@ApiTags('试卷')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('exam/papers')
export class ExamPaperController {
  constructor(private readonly service: ExamPaperService) {}

  @Get()
  @ApiOperation({ summary: '试卷列表' })
  async findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.service.findAll(page, pageSize)
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '创建试卷' })
  async create(@Body() dto: CreateExamPaperDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: '试卷详情' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '删除试卷' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}

/* ==================== Exam Sessions ==================== */

@ApiTags('考试')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('exam/sessions')
export class ExamSessionController {
  constructor(private readonly service: ExamSessionService) {}

  @Get('my-history')
  @ApiOperation({ summary: '我的考试历史' })
  async getMyHistory(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.service.getMyHistory(user.id, page, pageSize)
  }

  @Post('start')
  @ApiOperation({ summary: '开始考试' })
  async start(@Body() dto: StartExamDto, @CurrentUser() user: AuthUser) {
    return this.service.start(dto.paperId, user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: '考试结果' })
  async getResult(@Param('id', ParseIntPipe) id: number) {
    return this.service.getResult(id)
  }

  @Post(':id/submit')
  @ApiOperation({ summary: '提交考试' })
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitExamDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.submit(id, dto, user.id)
  }
}

/* ==================== Exam Statistics ==================== */

@ApiTags('考试统计')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exam/statistics')
export class ExamStatisticsController {
  constructor(private readonly service: ExamSessionService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '考试总体统计' })
  async getStatistics(@Query() query: ExamStatisticsQueryDto) {
    return this.service.getStatistics(query)
  }

  @Get(':paperId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '单试卷统计' })
  async getPaperStatistics(@Param('paperId', ParseIntPipe) paperId: number) {
    return this.service.getStatistics({ paperId })
  }
}
