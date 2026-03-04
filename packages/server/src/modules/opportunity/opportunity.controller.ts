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
import { OpportunityService } from './opportunity.service'
import { CreateOpportunityDto } from './dto/create-opportunity.dto'
import { UpdateOpportunityDto } from './dto/update-opportunity.dto'
import { QueryOpportunityDto } from './dto/query-opportunity.dto'
import { UpdateStageDto } from './dto/update-stage.dto'

@ApiTags('商机管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('opportunities')
export class OpportunityController {
  constructor(private readonly opportunityService: OpportunityService) {}

  @Get()
  @ApiOperation({ summary: 'Get opportunity list with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated opportunity list' })
  findAll(@Query() query: QueryOpportunityDto) {
    return this.opportunityService.findAll(query)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new opportunity' })
  @ApiResponse({ status: 201, description: 'Opportunity created successfully' })
  create(@Body() dto: CreateOpportunityDto) {
    return this.opportunityService.create(dto)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get opportunity statistics by stage' })
  @ApiResponse({ status: 200, description: 'Returns stage count and amount stats' })
  getStats() {
    return this.opportunityService.getStats()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get opportunity by ID' })
  @ApiResponse({ status: 200, description: 'Returns opportunity detail' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.opportunityService.findOne(id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update opportunity by ID' })
  @ApiResponse({ status: 200, description: 'Opportunity updated successfully' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOpportunityDto) {
    return this.opportunityService.update(id, dto)
  }

  @Put(':id/stage')
  @ApiOperation({ summary: 'Advance opportunity stage' })
  @ApiResponse({ status: 200, description: 'Stage updated and probability auto-adjusted' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  updateStage(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStageDto) {
    return this.opportunityService.updateStage(id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete opportunity by ID' })
  @ApiResponse({ status: 200, description: 'Opportunity deleted successfully' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.opportunityService.remove(id)
    return null
  }
}
