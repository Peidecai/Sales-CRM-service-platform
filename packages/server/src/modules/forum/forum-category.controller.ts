import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { UserRole } from '@crm/shared'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { Roles } from '../../common/decorators/roles.decorator'
import { ForumCategoryService } from './forum-category.service'
import { CreateForumCategoryDto } from './dto/create-forum-category.dto'

@Controller('forum/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class ForumCategoryController {
  constructor(private readonly categoryService: ForumCategoryService) {}

  @Get()
  async findAll() {
    return this.categoryService.findAll()
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id)
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateForumCategoryDto) {
    return this.categoryService.create(dto)
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateForumCategoryDto) {
    return this.categoryService.update(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id)
  }
}
