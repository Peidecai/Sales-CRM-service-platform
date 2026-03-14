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
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CallbackSignatureGuard } from '../../common/guards/callback-signature.guard'
import { ReplayAttackGuard } from '../../common/guards/replay-attack.guard'
import { Public } from '../../common/decorators/public.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { MaterialService } from './material.service'
import { OssUploadService } from './oss-upload.service'
import { PreviewService } from './preview.service'
import { QueryMaterialDto } from './dto/query-material.dto'
import { UpdateMaterialDto } from './dto/update-material.dto'
import { OssCallbackDto } from './dto/oss-callback.dto'

@ApiTags('素材')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('materials')
export class MaterialController {
  constructor(
    private readonly materialService: MaterialService,
    private readonly ossUploadService: OssUploadService,
    private readonly previewService: PreviewService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List materials with filters' })
  async list(@Query() query: QueryMaterialDto) {
    const { list, total } = await this.materialService.findAll(query)
    return { list, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 }
  }

  @Get('upload/sts-token')
  @ApiOperation({ summary: 'Get OSS STS token for direct upload' })
  getStsToken() {
    return this.ossUploadService.getStsToken()
  }

  @Post('upload/callback')
  @Public()
  @UseGuards(CallbackSignatureGuard, ReplayAttackGuard)
  @ApiOperation({ summary: 'OSS upload callback (signature verified)' })
  uploadCallback(@Body() dto: OssCallbackDto) {
    return this.ossUploadService.handleCallback(dto)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get material stats by type' })
  getStats() {
    return this.materialService.getStats()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get material by ID' })
  @ApiParam({ name: 'id', type: Number })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.materialService.findOne(id)
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get temporary access URL' })
  @ApiParam({ name: 'id', type: Number })
  async getUrl(@Param('id', ParseIntPipe) id: number) {
    const file = await this.materialService.findOne(id)
    const baseUrl = process.env.OSS_PUBLIC_URL ?? ''
    const url = baseUrl ? `${baseUrl}/${file.ossKey}` : `#material-${id}`
    return { url }
  }

  @Get(':id/preview-url')
  @ApiOperation({ summary: 'Get preview URL by strategy (inline|download)' })
  @ApiParam({ name: 'id', type: Number })
  getPreviewUrl(
    @Param('id', ParseIntPipe) id: number,
    @Query('mode') mode?: 'inline' | 'download',
  ) {
    return this.previewService.getPreviewUrl(id, mode ?? 'inline')
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update material name/category' })
  @ApiParam({ name: 'id', type: Number })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaterialDto) {
    return this.materialService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete material' })
  @ApiParam({ name: 'id', type: Number })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.materialService.remove(id)
    return null
  }
}
