import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { CampaignService } from './campaign.service'

@ApiTags('外呼任务')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get()
  @ApiOperation({ summary: '外呼任务列表' })
  async list(
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
    @CurrentUser() user?: AuthUser,
  ) {
    if (!user) throw new Error('Unauthorized')
    return this.campaignService.findAll({ status, page, pageSize }, user)
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '创建外呼任务' })
  async create(
    @Body() body: { name: string; customerIds?: number[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.campaignService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: '任务详情' })
  @ApiParam({ name: 'id' })
  async getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.campaignService.findOne(id, user)
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑（仅 draft）' })
  @ApiParam({ name: 'id' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.campaignService.update(id, body, user)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除（仅 draft/cancelled）' })
  @ApiParam({ name: 'id' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.campaignService.remove(id, user)
    return { ok: true }
  }

  @Post(':id/start')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseGuards(RolesGuard)
  @ApiParam({ name: 'id' })
  async start(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.campaignService.start(id, user)
    return { ok: true }
  }

  @Post(':id/pause')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseGuards(RolesGuard)
  @ApiParam({ name: 'id' })
  async pause(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.campaignService.pause(id, user)
    return { ok: true }
  }

  @Post(':id/resume')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseGuards(RolesGuard)
  @ApiParam({ name: 'id' })
  async resume(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.campaignService.resume(id, user)
    return { ok: true }
  }

  @Post(':id/stop')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseGuards(RolesGuard)
  @ApiParam({ name: 'id' })
  async stop(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.campaignService.stop(id, user)
    return { ok: true }
  }

  @Get(':id/items')
  @ApiOperation({ summary: '外呼明细列表' })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async getItems(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
    @CurrentUser() user?: AuthUser,
  ) {
    if (!user) throw new Error('Unauthorized')
    return this.campaignService.getItems(id, page, pageSize, user)
  }
}
