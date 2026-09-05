import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/security/current-user.decorator';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { RequirePermissions } from '../auth/security/permissions.decorator';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { CompleteDeliveryDto, CreateDeliveryDto, DeliveryAssigneeQueryDto, DeliveryParamDto, DeliveryQueryDto } from './dto/deliveries.dto';
import { DeliveriesService } from './deliveries.service';
import { DELIVERY_MANAGE_PERMISSION } from './deliveries.types';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(DELIVERY_MANAGE_PERMISSION)
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Get('delivery-assignees') listAssignees(@Query() query: DeliveryAssigneeQueryDto, @CurrentUser() user: { id: string }) { return this.deliveries.listAssignees(query, user.id); }
  @Get('deliveries') list(@Query() query: DeliveryQueryDto, @CurrentUser() user: { id: string }) { return this.deliveries.list(query, user.id); }
  @Post('deliveries') create(@Body() body: CreateDeliveryDto, @CurrentUser() user: { id: string }) { return this.deliveries.create(body, user.id); }
  @Get('deliveries/:id') detail(@Param() params: DeliveryParamDto, @CurrentUser() user: { id: string }) { return this.deliveries.detail(params.id, user.id); }
  @Post('deliveries/:id/start') @HttpCode(HttpStatus.OK)
  start(@Param() params: DeliveryParamDto, @CurrentUser() user: { id: string }) { return this.deliveries.start(params.id, user.id); }
  @Post('deliveries/:id/complete') @HttpCode(HttpStatus.OK)
  complete(@Param() params: DeliveryParamDto, @Body() body: CompleteDeliveryDto, @CurrentUser() user: { id: string }) { return this.deliveries.complete(params.id, body, user.id); }
  @Post('deliveries/:id/cancel') @HttpCode(HttpStatus.OK)
  cancel(@Param() params: DeliveryParamDto, @CurrentUser() user: { id: string }) { return this.deliveries.cancel(params.id, user.id); }
}
