import { Body, Controller, Get, Header, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/security/current-user.decorator';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { RequirePermissions } from '../auth/security/permissions.decorator';
import { CreatePaymentAttemptDto } from './payment-attempt.dto';
import { PaymentsService } from './payments.service';

@Controller('admin/sales/:saleId/payment-attempts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('SALE_MANAGE', 'FINANCIAL_PAYMENT_REGISTER')
export class PaymentAttemptsController {
  constructor(private readonly payments: PaymentsService) {}
  @Post() create(
    @Param('saleId') saleId: string,
    @Body() dto: CreatePaymentAttemptDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.payments.create(saleId, dto, user.id);
  }
  @Get() list(@Param('saleId') saleId: string, @CurrentUser() user: { id: string }) {
    return this.payments.list(saleId, user.id);
  }
}
@Controller('payments')
export class PublicPaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Get('public/:token')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  detail(@Param('token') token: string) {
    return this.payments.publicDetail(token);
  }
  @Post('public/:token/checkout')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  checkout(@Param('token') token: string) {
    return this.payments.checkout(token);
  }
  @Post('wompi/events')
  @HttpCode(200)
  webhook(@Body() body: unknown) {
    return this.payments.webhook(body);
  }
}
