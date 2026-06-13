import {
  Controller,
  Get,
  Post,
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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { PkService } from './pk.service'
import { PkBadgeService } from './pk-badge.service'
import { CreatePkDto } from './dto/create-pk.dto'
import { QueryPkDto } from './dto/query-pk.dto'

@ApiTags('销售PK')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('pk')
export class PkController {
  constructor(
    private readonly pkService: PkService,
    private readonly pkBadgeService: PkBadgeService,
  ) {}

  // ─── Static routes first ───────────────────────────────────────────────

  @Get('history')
  @ApiOperation({ summary: 'PK历史记录' })
  getHistory(@Query() query: QueryPkDto) {
    return this.pkService.getHistory(query)
  }

  @Get('my-stats')
  @ApiOperation({ summary: '我的PK战绩' })
  getMyStats(@CurrentUser() user: AuthUser) {
    return this.pkService.getMyStats(user.id)
  }

  @Get('badges')
  @ApiOperation({ summary: '我的徽章' })
  getBadges(@CurrentUser() user: AuthUser) {
    return this.pkBadgeService.getUserBadges(user.id)
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'PK列表' })
  findAll(@Query() query: QueryPkDto) {
    return this.pkService.findAll(query)
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '创建PK' })
  @ApiResponse({ status: 201, description: 'PK创建成功' })
  create(@Body() dto: CreatePkDto, @CurrentUser() user: AuthUser) {
    return this.pkService.create(dto, user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'PK详情' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pkService.findOne(id)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除PK' })
  @ApiParam({ name: 'id', type: Number })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.pkService.remove(id)
    return null
  }

  @Post(':id/start')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '开始PK' })
  @ApiParam({ name: 'id', type: Number })
  start(@Param('id', ParseIntPipe) id: number) {
    return this.pkService.start(id)
  }

  @Post(':id/settle')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '结算PK' })
  @ApiParam({ name: 'id', type: Number })
  settle(@Param('id', ParseIntPipe) id: number) {
    return this.pkService.settle(id)
  }

  @Get(':id/ranking')
  @ApiOperation({ summary: 'PK排名' })
  @ApiParam({ name: 'id', type: Number })
  getRanking(@Param('id', ParseIntPipe) id: number) {
    return this.pkService.getRanking(id)
  }

  @Get(':id/score')
  @ApiOperation({ summary: '获取PK实时分数' })
  @ApiParam({ name: 'id', type: Number })
  getScore(@Param('id', ParseIntPipe) id: number) {
    return this.pkService.getScore(id)
  }
}
