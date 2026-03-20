import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { TodoService } from './todo.service'
import { CreateTodoDto } from './dto/create-todo.dto'
import { UpdateTodoDto } from './dto/update-todo.dto'
import { QueryTodoDto } from './dto/query-todo.dto'

@ApiTags('待办事项')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('todos')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get()
  @ApiOperation({ summary: '待办列表' })
  async list(@Query() query: QueryTodoDto, @CurrentUser('id') userId: number) {
    const { list, total } = await this.todoService.findAll(userId, query)
    return { list, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 }
  }

  @Get('overdue-count')
  @ApiOperation({ summary: '逾期待办数量' })
  getOverdueCount(@CurrentUser('id') userId: number) {
    return this.todoService.getOverdueCount(userId)
  }

  @Get(':id')
  @ApiOperation({ summary: '待办详情' })
  @ApiParam({ name: 'id', type: Number })
  getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.todoService.findOne(id, userId)
  }

  @Post()
  @ApiOperation({ summary: '创建待办' })
  create(@Body() dto: CreateTodoDto, @CurrentUser('id') userId: number) {
    return this.todoService.create(userId, dto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新待办' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTodoDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.todoService.update(id, userId, dto)
  }

  @Put(':id/complete')
  @ApiOperation({ summary: '完成待办' })
  @ApiParam({ name: 'id', type: Number })
  complete(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.todoService.complete(id, userId)
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: '取消待办' })
  @ApiParam({ name: 'id', type: Number })
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.todoService.cancel(id, userId)
  }
}
