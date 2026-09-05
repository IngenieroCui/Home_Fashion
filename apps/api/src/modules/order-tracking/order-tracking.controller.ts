import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/security/current-user.decorator';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { RequirePermissions } from '../auth/security/permissions.decorator';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { ORDER_MANAGE_PERMISSION } from '../orders/orders.types';
import { CreateTrackingAccessDto, PublicTrackingTokenParamDto, TrackingOrderParamDto } from './dto/order-tracking.dto';
import { OrderTrackingService } from './order-tracking.service';

@Controller('admin/orders/:orderId/tracking-access')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(ORDER_MANAGE_PERMISSION)
export class AdminOrderTrackingController {
  constructor(private readonly tracking: OrderTrackingService) {}
  @Get() status(@Param() params: TrackingOrderParamDto, @CurrentUser() user: { id: string }) { return this.tracking.status(params.orderId, user.id); }
  @Post() createOrRotate(@Param() params: TrackingOrderParamDto, @Body() body: CreateTrackingAccessDto, @CurrentUser() user: { id: string }) { return this.tracking.createOrRotate(params.orderId, body, user.id); }
  @Post('revoke') revoke(@Param() params: TrackingOrderParamDto, @CurrentUser() user: { id: string }) { return this.tracking.revoke(params.orderId, user.id); }
}

@Controller('public/tracking')
export class PublicOrderTrackingController {
  constructor(private readonly tracking: OrderTrackingService) {}
  @Get(':token') lookup(@Param() params: PublicTrackingTokenParamDto) { return this.tracking.publicLookup(params.token); }
}
