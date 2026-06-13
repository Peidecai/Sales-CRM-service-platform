import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { UserRole } from '@crm/shared'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'
import { AiConfigService } from './ai-config.service'
import { AiPromptService } from './ai-prompt.service'
import { AiUsageService } from './ai-usage.service'
import { AiPlaygroundService } from './ai-playground.service'
import { UpdateAiConfigDto } from './dto/update-ai-config.dto'
import { CreatePromptTemplateDto, UpdatePromptTemplateDto } from './dto/prompt-template.dto'
import { PlaygroundDto, UsageQueryDto } from './dto/playground.dto'

@Controller('ai-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Roles(UserRole.ADMIN)
export class AiConfigController {
  constructor(
    private readonly configService: AiConfigService,
    private readonly promptService: AiPromptService,
    private readonly usageService: AiUsageService,
    private readonly playgroundService: AiPlaygroundService,
  ) {}

  // ─── Config ─────────────────────────────────────────────

  @Get('config')
  async getAllConfigs() {
    return { code: 0, message: 'success', data: await this.configService.getAllConfigs() }
  }

  @Get('config/:module')
  async getConfig(@Param('module') module: string) {
    return { code: 0, message: 'success', data: await this.configService.getConfig(module) }
  }

  @Put('config/:module')
  async updateConfig(
    @Param('module') module: string,
    @Body() dto: UpdateAiConfigDto,
    @CurrentUser() user: AuthUser,
  ) {
    return {
      code: 0,
      message: 'success',
      data: await this.configService.updateConfig(module, dto, user.id),
    }
  }

  // ─── Prompts ────────────────────────────────────────────

  @Get('prompts')
  async getAllPrompts() {
    return { code: 0, message: 'success', data: await this.promptService.findAll() }
  }

  @Post('prompts')
  async createPrompt(@Body() dto: CreatePromptTemplateDto, @CurrentUser() user: AuthUser) {
    return { code: 0, message: 'success', data: await this.promptService.create(dto, user.id) }
  }

  @Get('prompts/:id')
  async getPrompt(@Param('id') id: number) {
    return { code: 0, message: 'success', data: await this.promptService.findOne(id) }
  }

  @Put('prompts/:id')
  async updatePrompt(
    @Param('id') id: number,
    @Body() dto: UpdatePromptTemplateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return { code: 0, message: 'success', data: await this.promptService.update(id, dto, user.id) }
  }

  @Delete('prompts/:id')
  async deletePrompt(@Param('id') id: number) {
    await this.promptService.remove(id)
    return { code: 0, message: 'success', data: null }
  }

  @Get('prompts/:id/history')
  async getPromptHistory(@Param('id') id: number) {
    return { code: 0, message: 'success', data: await this.promptService.getHistory(id) }
  }

  @Post('prompts/:id/rollback')
  async rollbackPrompt(@Param('id') id: number, @Body() body: { version?: number }) {
    return {
      code: 0,
      message: 'success',
      data: await this.promptService.rollback(id, body.version),
    }
  }

  // ─── Playground ─────────────────────────────────────────

  @Post('playground')
  async testPlayground(@Body() dto: PlaygroundDto, @CurrentUser() user: AuthUser) {
    return {
      code: 0,
      message: 'success',
      data: await this.playgroundService.testPrompt(dto, user.id),
    }
  }

  // ─── Usage ──────────────────────────────────────────────

  @Get('usage')
  async getUsageStats(@Query() query: UsageQueryDto) {
    return { code: 0, message: 'success', data: await this.usageService.getStatistics(query) }
  }

  @Get('usage/cost')
  async getUsageCost(@Query() query: UsageQueryDto) {
    return { code: 0, message: 'success', data: await this.usageService.getCostEstimate(query) }
  }
}
