import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { SigningService } from './signing.service'
import { CreateSigningProcessDto } from './dto/create-signing-process.dto'
import { UpdateSigningStatusDto } from './dto/update-signing-status.dto'
import { SigningQueryDto } from './dto/signing-query.dto'

@ApiTags('签约促成')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('signing')
export class SigningController {
  constructor(private readonly signingService: SigningService) {}

  // Static routes BEFORE :id

  @Get('statistics')
  @ApiOperation({ summary: '签约统计' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getStatistics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.signingService.getStatistics(startDate, endDate)
  }

  @Get('ranking')
  @ApiOperation({ summary: '签约排行' })
  @ApiQuery({ name: 'period', required: false, description: 'day | week | month' })
  @ApiQuery({ name: 'limit', required: false })
  async getRanking(
    @Query('period', new DefaultValuePipe('month')) period: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.signingService.getRanking(period, Math.min(limit, 100))
  }

  @Get()
  @ApiOperation({ summary: '签约流程列表' })
  async findAll(@Query() query: SigningQueryDto, @CurrentUser() user: AuthUser) {
    return this.signingService.findAll(query, user)
  }

  @Post()
  @ApiOperation({ summary: '创建签约流程（从商机）' })
  async create(@Body() dto: CreateSigningProcessDto, @CurrentUser() user: AuthUser) {
    return this.signingService.create(dto, user)
  }

  // Parameterized routes

  @Get(':id')
  @ApiOperation({ summary: '签约流程详情' })
  @ApiParam({ name: 'id' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.signingService.findOne(id, user)
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新签约状态' })
  @ApiParam({ name: 'id' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSigningStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.signingService.updateStatus(id, dto, user)
  }
}
