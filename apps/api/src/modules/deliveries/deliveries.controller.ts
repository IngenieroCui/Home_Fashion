import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MediaCleanupService } from '../media/media-cleanup.service';
import { CloudinaryMediaService } from '../media/cloudinary-media.service';
import { validateMediaFiles } from '../media/validate-media-files';
import type { ImageFile } from '../media/media.types';
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
  constructor(private readonly deliveries: DeliveriesService, private readonly media: CloudinaryMediaService, private readonly cleanup: MediaCleanupService) {}

  @Get('delivery-assignees') listAssignees(@Query() query: DeliveryAssigneeQueryDto, @CurrentUser() user: { id: string }) { return this.deliveries.listAssignees(query, user.id); }
  @Get('deliveries') list(@Query() query: DeliveryQueryDto, @CurrentUser() user: { id: string }) { return this.deliveries.list(query, user.id); }
  @Post('deliveries') create(@Body() body: CreateDeliveryDto, @CurrentUser() user: { id: string }) { return this.deliveries.create(body, user.id); }
  @Get('deliveries/:id') detail(@Param() params: DeliveryParamDto, @CurrentUser() user: { id: string }) { return this.deliveries.detail(params.id, user.id); }
  @Post('deliveries/:id/start') @HttpCode(HttpStatus.OK)
  start(@Param() params: DeliveryParamDto, @CurrentUser() user: { id: string }) { return this.deliveries.start(params.id, user.id); }
  @Post('deliveries/:id/complete') @HttpCode(HttpStatus.OK)
  complete() { throw new BadRequestException('Adjunta la fotografía mediante la carga de archivos para completar la entrega'); }
  @Post('deliveries/:id/complete-media') @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 10 * 1024 * 1024, files: 5 } }))
  async completeMedia(@Param() params: DeliveryParamDto, @Body() body: CompleteDeliveryDto, @UploadedFiles() input: ImageFile[], @CurrentUser() user: { id: string }) {
    const files = validateMediaFiles(input, 1);
    const delivery = await this.deliveries.detail(params.id, user.id);
    const uploads: string[] = [];
    const urls: string[] = [];
    try {
      const results = await Promise.allSettled(files.map((file) => this.media.uploadImage(file, 'deliveries', String(delivery.code))));
      for (const result of results) {
        if (result.status === 'fulfilled') { uploads.push(result.value.publicId); urls.push(result.value.secureUrl); }
      }
      const failed = results.find((result) => result.status === 'rejected');
      if (failed && failed.status === 'rejected') throw failed.reason;
      return await this.deliveries.complete(params.id, { receiverName: body.receiverName.trim(), evidenceUrls: urls }, user.id);
    } catch (error) {
      await this.cleanup.scheduleRollback('deliveries', uploads);
      throw error;
    }
  }
  @Post('deliveries/:id/cancel') @HttpCode(HttpStatus.OK)
  cancel(@Param() params: DeliveryParamDto, @CurrentUser() user: { id: string }) { return this.deliveries.cancel(params.id, user.id); }
}
