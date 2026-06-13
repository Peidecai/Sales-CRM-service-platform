import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { RouteService } from './route.service'
import { OptimizeRouteDto } from './dto/optimize-route.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'

@ApiTags('路线规划')
@Controller('route')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Post('optimize')
  @ApiOperation({ summary: '路线优化（最近邻算法）' })
  @ApiResponse({ status: 200, description: '返回优化后的客户拜访顺序' })
  @ApiResponse({ status: 400, description: '参数错误' })
  async optimize(@Body() dto: OptimizeRouteDto) {
    return this.routeService.optimizeRoute(dto.customerIds, dto.startLatitude, dto.startLongitude)
  }
}
