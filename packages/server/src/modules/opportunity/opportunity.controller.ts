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
import { NotificationService } from '../notification/notification.service'
import { CreateOpportunityDto } from './dto/create-opportunity.dto'
import { UpdateOpportunityDto } from './dto/update-opportunity.dto'
import { QueryOpportunityDto } from './dto/query-opportunity.dto'
import { UpdateStageDto } from './dto/update-stage.dto'

@ApiTags('商机管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('opportunities')
export class OpportunityController {
  constructor(
    private readonly opportunityService: OpportunityService,
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
    const opp = await this.opportunityService.updateStage(id, dto, user)
    this.notificationService.opportunityStageChanged(
      user.id,
      user.username,
      opp.id,
      opp.title,
      dto.stage,
      opp.stage,
    )
    return opp
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
