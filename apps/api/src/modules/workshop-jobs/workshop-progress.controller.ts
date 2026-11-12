import { Body, Controller, Get, Param, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MediaCleanupService } from '../media/media-cleanup.service';
import { CloudinaryMediaService } from '../media/cloudinary-media.service';
import { validateMediaFiles } from '../media/validate-media-files';
import type { ImageFile } from '../media/media.types';
import { CurrentUser } from '../auth/security/current-user.decorator';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { RequirePermissions } from '../auth/security/permissions.decorator';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { AdminWorkshopProgressQueryDto, ReviewWorkshopProgressDto, SubmitWorkshopProgressDto, WorkshopOwnJobsQueryDto, WorkshopProgressJobParamDto, WorkshopProgressReportParamDto } from './dto/workshop-progress.dto';
import { PROGRESS_REVIEW_PERMISSION, WORKSHOP_JOB_VIEW_PERMISSION, WORKSHOP_PROGRESS_SUBMIT_PERMISSION } from './workshop-jobs.types';
import { WorkshopProgressService } from './workshop-progress.service';

@Controller('workshop/jobs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkshopOwnJobsController {
  constructor(private readonly progress: WorkshopProgressService, private readonly media: CloudinaryMediaService, private readonly cleanup: MediaCleanupService) {}
  @Get() @RequirePermissions(WORKSHOP_JOB_VIEW_PERMISSION) list(@CurrentUser() user: { id: string }, @Query() query: WorkshopOwnJobsQueryDto) { return this.progress.listOwnJobs(user.id, query); }
  @Get(':id') @RequirePermissions(WORKSHOP_JOB_VIEW_PERMISSION) detail(@CurrentUser() user: { id: string }, @Param() params: WorkshopProgressJobParamDto) { return this.progress.ownJobDetail(user.id, params.id); }
  @Post(':id/progress') @RequirePermissions(WORKSHOP_PROGRESS_SUBMIT_PERMISSION) submit(@CurrentUser() user: { id: string }, @Param() params: WorkshopProgressJobParamDto, @Body() body: SubmitWorkshopProgressDto) { return this.progress.submit(user.id, params.id, body); }
  @Post(':id/progress-media') @RequirePermissions(WORKSHOP_PROGRESS_SUBMIT_PERMISSION)
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 10 * 1024 * 1024, files: 5 } }))
  async submitMedia(@CurrentUser() user: { id: string }, @Param() params: WorkshopProgressJobParamDto, @Body() body: SubmitWorkshopProgressDto, @UploadedFiles() input: ImageFile[]) {
    const files = validateMediaFiles(input, 0);
    const filesIdentity = body.requestId && files.length
      ? files.map(file => createHash('sha256').update(file.buffer).digest('hex')).join(':')
      : undefined;
    const preparation = await this.progress.validateMediaSubmission(user.id, params.id, body, filesIdentity);
    if (preparation.replay) return preparation.replay;
    const uploads: string[] = [];
    const urls: string[] = [];
    try {
      const results = await Promise.allSettled(files.map((file) => this.media.uploadImage(file, 'workshop-progress', preparation.code)));
      for (const result of results) {
        if (result.status === 'fulfilled') { uploads.push(result.value.publicId); urls.push(result.value.secureUrl); }
      }
      const failed = results.find((result) => result.status === 'rejected');
      if (failed && failed.status === 'rejected') throw failed.reason;
      const result = await this.progress.submit(user.id, params.id, body, urls, filesIdentity);
      const saved = Array.isArray(result.evidenceUrls) ? result.evidenceUrls : [];
      const redundant = uploads.filter((_publicId, index) => !saved.includes(urls[index]));
      if (redundant.length) await this.cleanup.scheduleRollback('workshop-progress', redundant);
      return result;
    } catch (error) {
      await this.cleanup.scheduleRollback('workshop-progress', uploads);
      throw error;
    }
  }
}

@Controller('admin/workshop-progress')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PROGRESS_REVIEW_PERMISSION)
export class AdminWorkshopProgressController {
  constructor(private readonly progress: WorkshopProgressService) {}
  @Get() list(@Query() query: AdminWorkshopProgressQueryDto) { return this.progress.listAdmin(query); }
  @Get(':id') detail(@Param() params: WorkshopProgressReportParamDto) { return this.progress.adminDetail(params.id); }
  @Post(':id/review') review(@CurrentUser() user: { id: string }, @Param() params: WorkshopProgressReportParamDto, @Body() body: ReviewWorkshopProgressDto) { return this.progress.review(params.id, user.id, body); }
}
