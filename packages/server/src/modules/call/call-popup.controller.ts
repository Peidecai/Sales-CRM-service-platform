import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { CustomerMatcherService } from './customer-matcher.service'
import { PopupAggregateService } from './popup-aggregate.service'
import { UpdatePopupConfigDto } from './dto/update-popup-config.dto'

@ApiTags('来电弹屏')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('call-popup')
export class CallPopupController {
  constructor(
    private readonly customerMatcher: CustomerMatcherService,
    private readonly popupAggregate: PopupAggregateService,
  ) {}

  @Get('by-phone')
  @ApiOperation({ summary: '按号码获取弹屏数据' })
  @ApiQuery({ name: 'phone', required: true })
  async getPopupByPhone(@Query('phone') phone: string) {
    if (!phone?.trim()) throw new NotFoundException('Phone required')
    const match = await this.customerMatcher.matchByPhone(phone.trim())
    if (!match?.customer) throw new NotFoundException('No customer matched')
    const popupData = await this.popupAggregate.getPopupData(match.customer.id, match.contact?.id)
    return {
      phone: phone.trim(),
      customerId: match.customer.id,
      contactId: match.contact?.id,
      popupData,
    }
  }

  @Get('by-customer/:customerId')
  @ApiOperation({ summary: '按客户ID获取弹屏数据（刷新）' })
  async getPopupByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('contactId') contactId?: string,
  ) {
    const contactIdNum = contactId ? parseInt(contactId, 10) : undefined
    const popupData = await this.popupAggregate.getPopupData(
      customerId,
      Number.isNaN(contactIdNum as number) ? undefined : (contactIdNum as number),
    )
    return { customerId, popupData }
  }

  @Get('config')
  @ApiOperation({ summary: '获取弹屏配置' })
  getPopupConfig(@CurrentUser() user: AuthUser) {
    return {
      autoPop: true,
      showRecentFollowUps: true,
      showLastSummary: true,
      userId: user.id,
    }
  }

  @Put('config')
  @ApiOperation({ summary: '更新当前用户弹屏配置' })
  updatePopupConfig(@CurrentUser() user: AuthUser, @Body() dto: UpdatePopupConfigDto) {
    return {
      userId: user.id,
      ...dto,
    }
  }
}
