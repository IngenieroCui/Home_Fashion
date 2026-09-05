import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/security/current-user.decorator';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { RequirePermissions } from '../auth/security/permissions.decorator';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import {
  CreateSaleDto,
  IdParamDto,
  QuoteParamDto,
  RegisterSalePaymentDto,
  SalePaymentParamDto,
  SaleQueryDto,
  VoidSalePaymentDto
} from './dto/sales.dto';
import {
  PAYMENT_CORRECT_PERMISSION,
  PAYMENT_REGISTER_PERMISSION,
  SALE_MANAGE_PERMISSION
} from './sales.types';
import { SalesService } from './sales.service';
@Controller('admin/sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}
  @Get() @RequirePermissions(SALE_MANAGE_PERMISSION) list(
    @Query() query: SaleQueryDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.sales.list(query, user.id);
  }
  @Post() @RequirePermissions(SALE_MANAGE_PERMISSION) create(
    @Body() body: CreateSaleDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.sales.createDirect(body, user.id);
  }
  @Post('from-quote/:quoteId') @RequirePermissions(SALE_MANAGE_PERMISSION) fromQuote(
    @Param() params: QuoteParamDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.sales.createFromQuote(params.quoteId, user.id);
  }
  @Post(':id/payments') @RequirePermissions(PAYMENT_REGISTER_PERMISSION) registerPayment(
    @Param() params: IdParamDto,
    @Body() body: RegisterSalePaymentDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.sales.registerPayment(params.id, body, user.id);
  }
  @Post(':saleId/payments/:paymentId/void') @RequirePermissions(PAYMENT_CORRECT_PERMISSION) voidPayment(
    @Param() params: SalePaymentParamDto,
    @Body() body: VoidSalePaymentDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.sales.voidPayment(params.saleId, params.paymentId, body.reason, user.id);
  }
  @Get(':id') @RequirePermissions(SALE_MANAGE_PERMISSION) detail(
    @Param() params: IdParamDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.sales.detail(params.id, user.id);
  }
}
