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
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { TrainingCategoryService } from './training-category.service'
import { TrainingVideoService } from './training-video.service'
import { VideoProgressService } from './video-progress.service'
import { VideoBookmarkService } from './video-bookmark.service'
import { TrainingTaskService } from './training-task.service'
import { CreateTrainingCategoryDto, UpdateTrainingCategoryDto } from './dto/training-category.dto'
import {
  CreateTrainingVideoDto,
  UpdateTrainingVideoDto,
  QueryVideoDto,
} from './dto/training-video.dto'
import {
  CreateChapterDto,
  UpdateChapterDto,
  UpdateProgressDto,
  CreateBookmarkDto,
  CreateTrainingTaskDto,
} from './dto/misc.dto'

@ApiTags('视频培训')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('training')
export class TrainingController {
  constructor(
    private readonly categoryService: TrainingCategoryService,
    private readonly videoService: TrainingVideoService,
    private readonly progressService: VideoProgressService,
    private readonly bookmarkService: VideoBookmarkService,
    private readonly taskService: TrainingTaskService,
  ) {}

  // ─── Categories ─────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'Get all training categories' })
  getCategories() {
    return this.categoryService.findAll()
  }

  @Post('categories')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create training category' })
  createCategory(@Body() dto: CreateTrainingCategoryDto) {
    return this.categoryService.create(dto)
  }

  @Put('categories/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update training category' })
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTrainingCategoryDto) {
    return this.categoryService.update(id, dto)
  }

  @Delete('categories/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete training category' })
  async removeCategory(@Param('id', ParseIntPipe) id: number) {
    await this.categoryService.remove(id)
    return null
  }

  // ─── Videos ─────────────────────────────────────────────────

  @Get('videos')
  @ApiOperation({ summary: 'List training videos with pagination' })
  getVideos(@Query() query: QueryVideoDto) {
    return this.videoService.findAll(query)
  }

  @Post('videos')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create training video' })
  createVideo(@Body() dto: CreateTrainingVideoDto, @CurrentUser('id') userId: number) {
    return this.videoService.create(dto, userId)
  }

  @Get('videos/:id')
  @ApiOperation({ summary: 'Get video detail' })
  getVideo(@Param('id', ParseIntPipe) id: number) {
    return this.videoService.findOne(id)
  }

  @Put('videos/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update training video' })
  updateVideo(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTrainingVideoDto) {
    return this.videoService.update(id, dto)
  }

  @Delete('videos/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete training video' })
  async removeVideo(@Param('id', ParseIntPipe) id: number) {
    await this.videoService.remove(id)
    return null
  }

  @Post('videos/:id/publish')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Toggle video publish status' })
  togglePublish(@Param('id', ParseIntPipe) id: number) {
    return this.videoService.togglePublish(id)
  }

  // ─── Chapters ───────────────────────────────────────────────

  @Get('videos/:videoId/chapters')
  @ApiOperation({ summary: 'List chapters for video' })
  getChapters(@Param('videoId', ParseIntPipe) videoId: number) {
    return this.videoService.findChapters(videoId)
  }

  @Post('videos/:videoId/chapters')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create chapter for video' })
  createChapter(@Param('videoId', ParseIntPipe) videoId: number, @Body() dto: CreateChapterDto) {
    return this.videoService.createChapter(videoId, dto)
  }

  @Put('chapters/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update chapter' })
  updateChapter(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChapterDto) {
    return this.videoService.updateChapter(id, dto)
  }

  @Delete('chapters/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete chapter' })
  async removeChapter(@Param('id', ParseIntPipe) id: number) {
    await this.videoService.removeChapter(id)
    return null
  }

  // ─── Progress ───────────────────────────────────────────────

  @Get('videos/:videoId/progress')
  @ApiOperation({ summary: 'Get current user progress for video' })
  getProgress(@Param('videoId', ParseIntPipe) videoId: number, @CurrentUser('id') userId: number) {
    return this.progressService.getProgress(userId, videoId)
  }

  @Put('videos/:videoId/progress')
  @ApiOperation({ summary: 'Update watch progress' })
  updateProgress(
    @Param('videoId', ParseIntPipe) videoId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.progressService.updateProgress(userId, videoId, dto)
  }

  @Get('my/stats')
  @ApiOperation({ summary: 'Get current user learning statistics' })
  getMyStats(@CurrentUser('id') userId: number) {
    return this.progressService.getUserStats(userId)
  }

  // ─── Bookmarks ──────────────────────────────────────────────

  @Get('videos/:videoId/bookmarks')
  @ApiOperation({ summary: 'Get bookmarks for video' })
  getBookmarks(@Param('videoId', ParseIntPipe) videoId: number, @CurrentUser('id') userId: number) {
    return this.bookmarkService.findByUserAndVideo(userId, videoId)
  }

  @Post('videos/:videoId/bookmarks')
  @ApiOperation({ summary: 'Create bookmark' })
  createBookmark(
    @Param('videoId', ParseIntPipe) videoId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: CreateBookmarkDto,
  ) {
    return this.bookmarkService.create(userId, videoId, dto)
  }

  @Delete('bookmarks/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete bookmark' })
  async removeBookmark(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    await this.bookmarkService.remove(id, userId)
    return null
  }

  // ─── Tasks ──────────────────────────────────────────────────

  @Get('tasks')
  @ApiOperation({ summary: 'List training tasks' })
  getTasks(
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.taskService.findAll({
      userId: userId ? parseInt(userId, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    })
  }

  @Get('tasks/statistics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get task statistics' })
  getTaskStatistics() {
    return this.taskService.getStatistics()
  }

  @Post('tasks')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create training task' })
  createTask(@Body() dto: CreateTrainingTaskDto, @CurrentUser('id') userId: number) {
    return this.taskService.create(dto, userId)
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task detail' })
  getTask(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.findOne(id)
  }

  @Post('tasks/:id/complete')
  @ApiOperation({ summary: 'Mark task as completed by current user' })
  completeTask(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.taskService.markComplete(id, userId)
  }
}
