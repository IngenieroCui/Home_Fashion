import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/security/current-user.decorator';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { RequirePermissions } from '../auth/security/permissions.decorator';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { CreateWorkshopJobDto, WorkshopJobParamDto, WorkshopJobQueryDto, WorkshopUserQueryDto } from './dto/workshop-jobs.dto';
import { WorkshopJobsService } from './workshop-jobs.service';
import { WORKSHOP_MANAGE_PERMISSION } from './workshop-jobs.types';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(WORKSHOP_MANAGE_PERMISSION)
export class WorkshopJobsController {
  constructor(private readonly jobs: WorkshopJobsService) {}

  @Get('workshop-users') listWorkshopUsers(@Query() query: WorkshopUserQueryDto) { return this.jobs.listWorkshopUsers(query); }
  @Get('workshop-jobs') list(@Query() query: WorkshopJobQueryDto) { return this.jobs.list(query); }
  @Post('workshop-jobs') create(@Body() body: CreateWorkshopJobDto, @CurrentUser() user: { id: string }) { return this.jobs.create(body, user.id); }
  @Get('workshop-jobs/:id') detail(@Param() params: WorkshopJobParamDto) { return this.jobs.detail(params.id); }
}
