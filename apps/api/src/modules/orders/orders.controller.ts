import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/security/current-user.decorator';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { RequirePermissions } from '../auth/security/permissions.decorator';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { CreateOrderFromSaleDto, OrderParamDto, OrderQueryDto, SaleParamDto } from './dto/orders.dto';
import { OrdersService } from './orders.service';
import { ORDER_MANAGE_PERMISSION } from './orders.types';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(ORDER_MANAGE_PERMISSION)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get() list(@Query() query: OrderQueryDto, @CurrentUser() user: { id: string }) { return this.orders.list(query, user.id); }
  @Post('from-sale/:saleId') createFromSale(@Param() params: SaleParamDto, @Body() body: CreateOrderFromSaleDto, @CurrentUser() user: { id: string }) { return this.orders.createFromSale(params.saleId, body, user.id); }
  @Get(':id') detail(@Param() params: OrderParamDto) { return this.orders.detail(params.id); }
}
