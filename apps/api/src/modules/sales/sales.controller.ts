import { Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash } from 'node:crypto';
import { MediaCleanupService } from '../media/media-cleanup.service';
import { CloudinaryMediaService } from '../media/cloudinary-media.service';
import { validateMediaFiles } from '../media/validate-media-files';
import type { ImageFile } from '../media/media.types';
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
  constructor(private readonly sales: SalesService, private readonly media: CloudinaryMediaService, private readonly cleanup: MediaCleanupService) {}
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
  @Post(':id/payments-media') @RequirePermissions(PAYMENT_REGISTER_PERMISSION)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  async registerPaymentMedia(@Param() params: IdParamDto, @Body() body: RegisterSalePaymentDto,
    @UploadedFile() file: ImageFile | undefined, @CurrentUser() user: { id: string }) {
    validateMediaFiles(file ? [file] : [], 0);
    const evidenceIdentity = file ? createHash('sha256').update(file.buffer).digest('hex') : '';
    const sale = await this.sales.preparePaymentMedia(params.id, body, user.id, evidenceIdentity);
    if (sale.replay) return sale.replay;
    const uploaded = file ? await this.media.uploadImage(file, 'payments', sale.code) : undefined;
    try {
      const result = await this.sales.registerPayment(params.id, { ...body, evidenceUrl: uploaded?.secureUrl }, user.id, evidenceIdentity);
      if (uploaded && result.payment.evidenceUrl !== uploaded.secureUrl) await this.cleanup.scheduleRollback('payments', [uploaded.publicId]);
      return result;
    } catch (error) {
      if (uploaded) await this.cleanup.scheduleRollback('payments', [uploaded.publicId]);
      throw error;
    }
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
