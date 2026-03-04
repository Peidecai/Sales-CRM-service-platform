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
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CallRecordService } from './call-record.service'
import { CreateCallRecordDto } from './dto/create-call-record.dto'
import { UpdateCallRecordDto } from './dto/update-call-record.dto'
import { QueryCallRecordDto } from './dto/query-call-record.dto'

@ApiTags('通话记录')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('call-records')
export class CallRecordController {
  constructor(private readonly callRecordService: CallRecordService) {}

  @Get()
  @ApiOperation({ summary: 'Get call record list with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated call record list' })
  async findAll(@Query() query: QueryCallRecordDto) {
    return this.callRecordService.findAll(query)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new call record' })
  @ApiResponse({ status: 201, description: 'Call record created successfully' })
  create(@Body() dto: CreateCallRecordDto) {
    return this.callRecordService.create(dto)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get call record statistics' })
  @ApiResponse({ status: 200, description: 'Returns call record statistics' })
  getStats(@Query('userId') userId?: string) {
    const parsedUserId = userId ? parseInt(userId, 10) : undefined
    return this.callRecordService.getStats(parsedUserId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get call record by ID' })
  @ApiResponse({ status: 200, description: 'Returns call record detail' })
  @ApiResponse({ status: 404, description: 'Call record not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.callRecordService.findOne(id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update call record by ID' })
  @ApiResponse({ status: 200, description: 'Call record updated successfully' })
  @ApiResponse({ status: 404, description: 'Call record not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCallRecordDto) {
    return this.callRecordService.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete call record by ID' })
  @ApiResponse({ status: 200, description: 'Call record deleted successfully' })
  @ApiResponse({ status: 404, description: 'Call record not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.callRecordService.remove(id)
    return null
  }

  @Post(':id/summarize')
  @ApiOperation({ summary: 'Generate AI summary for a call record' })
  @ApiResponse({ status: 200, description: 'Summary job submitted, returns jobId' })
  @ApiResponse({ status: 400, description: 'Call record has no notes' })
  @ApiResponse({ status: 404, description: 'Call record not found' })
  summarize(@Param('id', ParseIntPipe) id: number) {
    return this.callRecordService.summarize(id)
  }
}
