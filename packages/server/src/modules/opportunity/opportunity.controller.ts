import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import type { Response } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { OpportunityService } from './opportunity.service'
import { OpportunityFollowLogService } from './opportunity-follow-log.service'
import { NotificationService } from '../notification/notification.service'
import { CreateOpportunityDto } from './dto/create-opportunity.dto'
import { UpdateOpportunityDto } from './dto/update-opportunity.dto'
import { QueryOpportunityDto } from './dto/query-opportunity.dto'
import { UpdateStageDto } from './dto/update-stage.dto'
import { CreateOpportunityFollowLogDto } from './dto/create-opportunity-follow-log.dto'

@ApiTags('商机管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('opportunities')
export class OpportunityController {
  constructor(
    private readonly opportunityService: OpportunityService,
    private readonly opportunityFollowLogService: OpportunityFollowLogService,
    private readonly notificationService: NotificationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get opportunity list with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated opportunity list' })
  findAll(@Query() query: QueryOpportunityDto, @CurrentUser() user: AuthUser) {
    return this.opportunityService.findAll(query, user)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new opportunity' })
  @ApiResponse({ status: 201, description: 'Opportunity created successfully' })
  async create(@Body() dto: CreateOpportunityDto, @CurrentUser() user: AuthUser) {
    const opp = await this.opportunityService.create(dto)
    this.notificationService.opportunityCreated(user.id, user.username, opp.id, opp.title)
    return opp
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Export all opportunities as CSV' })
  @ApiResponse({ status: 200, description: 'Returns CSV file' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
  async exportCsv(@Res() res: Response, @CurrentUser() user: AuthUser) {
    const csv = await this.opportunityService.exportCsv(user)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=opportunities.csv')
    res.send(csv)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get opportunity statistics by stage' })
  @ApiResponse({ status: 200, description: 'Returns stage count and amount stats' })
  getStats(@CurrentUser() user: AuthUser) {
    return this.opportunityService.getStats(user)
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Get sales funnel data with conversion rates' })
  @ApiResponse({ status: 200, description: 'Returns funnel stages, totalAmount and winRate' })
  getSalesFunnel(@CurrentUser() user: AuthUser) {
    return this.opportunityService.getSalesFunnel(user)
  }

  @Get(':id/follow-logs')
  @ApiOperation({ summary: 'Get follow logs of an opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns follow log list' })
  getFollowLogs(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.opportunityService
      .findOne(id, user)
      .then(() => this.opportunityFollowLogService.findByOpportunityId(id, user))
  }

  @Post(':id/follow-logs')
  @ApiOperation({ summary: 'Create a follow log for an opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity ID', type: Number })
  @ApiResponse({ status: 201, description: 'Follow log created' })
  createFollowLog(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateOpportunityFollowLogDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.opportunityService
      .findOne(id, user)
      .then(() => this.opportunityFollowLogService.create(id, dto, user))
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get opportunity by ID' })
  @ApiParam({ name: 'id', description: 'Opportunity ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns opportunity detail' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — SALES can only access own opportunities' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.opportunityService.findOne(id, user)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update opportunity by ID' })
  @ApiParam({ name: 'id', description: 'Opportunity ID', type: Number })
  @ApiResponse({ status: 200, description: 'Opportunity updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — SALES can only update own opportunities' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOpportunityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.opportunityService.update(id, dto, user)
  }

  @Put(':id/stage')
  @ApiOperation({ summary: 'Advance opportunity stage' })
  @ApiParam({ name: 'id', description: 'Opportunity ID', type: Number })
  @ApiResponse({ status: 200, description: 'Stage updated and probability auto-adjusted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — SALES can only update own opportunities' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  async updateStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStageDto,
    @CurrentUser() user: AuthUser,
  ) {
    const { opportunity, previousStage, currentStage } = await this.opportunityService.updateStage(
      id,
      dto,
      user,
    )
    this.notificationService.opportunityStageChanged(
      user.id,
      user.username,
      opportunity.id,
      opportunity.title,
      previousStage,
      currentStage,
    )
    return opportunity
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete opportunity by ID' })
  @ApiParam({ name: 'id', description: 'Opportunity ID', type: Number })
  @ApiResponse({ status: 200, description: 'Opportunity deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.opportunityService.remove(id)
    this.notificationService.opportunityDeleted(user.id, user.username, id)
    return null
  }
}
