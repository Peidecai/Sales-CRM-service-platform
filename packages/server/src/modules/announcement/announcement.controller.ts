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
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { AnnouncementService } from './announcement.service'
import { CreateAnnouncementDto } from './dto/create-announcement.dto'
import { QueryAnnouncementDto } from './dto/query-announcement.dto'

@ApiTags('公告')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get()
  @ApiOperation({ summary: 'List announcements' })
  async list(@Query() query: QueryAnnouncementDto) {
    const { list, total } = await this.announcementService.findAll(query)
    return { list, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 }
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread count for current user' })
  getUnreadCount(@CurrentUser('id') userId: number) {
    return this.announcementService.getUnreadCount(userId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get announcement by ID' })
  @ApiParam({ name: 'id', type: Number })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.announcementService.findOne(id)
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create announcement' })
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser('id') userId: number) {
    return this.announcementService.create({
      ...dto,
      publishAt: dto.publishAt ? new Date(dto.publishAt) : new Date(),
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      createdBy: userId,
    })
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update announcement' })
  @ApiParam({ name: 'id', type: Number })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateAnnouncementDto>) {
    const updates: Record<string, unknown> = { ...dto }
    if (dto.publishAt) updates.publishAt = new Date(dto.publishAt)
    if (dto.endAt) updates.endAt = new Date(dto.endAt)
    return this.announcementService.update(id, updates as Record<string, unknown>)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Soft delete announcement' })
  @ApiParam({ name: 'id', type: Number })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.announcementService.remove(id)
    return null
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark announcement as read' })
  @ApiParam({ name: 'id', type: Number })
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.announcementService.markRead(userId, id)
  }
}
