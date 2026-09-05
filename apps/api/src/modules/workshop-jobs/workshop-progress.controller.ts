import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
  constructor(private readonly progress: WorkshopProgressService) {}
  @Get() @RequirePermissions(WORKSHOP_JOB_VIEW_PERMISSION) list(@CurrentUser() user: { id: string }, @Query() query: WorkshopOwnJobsQueryDto) { return this.progress.listOwnJobs(user.id, query); }
  @Get(':id') @RequirePermissions(WORKSHOP_JOB_VIEW_PERMISSION) detail(@CurrentUser() user: { id: string }, @Param() params: WorkshopProgressJobParamDto) { return this.progress.ownJobDetail(user.id, params.id); }
  @Post(':id/progress') @RequirePermissions(WORKSHOP_PROGRESS_SUBMIT_PERMISSION) submit(@CurrentUser() user: { id: string }, @Param() params: WorkshopProgressJobParamDto, @Body() body: SubmitWorkshopProgressDto) { return this.progress.submit(user.id, params.id, body); }
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
