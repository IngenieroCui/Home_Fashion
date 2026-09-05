import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { WorkshopJobsController } from './workshop-jobs.controller';
import { WORKSHOP_MANAGE_PERMISSION } from './workshop-jobs.types';

describe('WorkshopJobsController security', () => {
  it('protects all workshop administration endpoints with WORKSHOP_MANAGE', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, WorkshopJobsController)).toEqual([JwtAuthGuard, PermissionsGuard]);
    expect(Reflect.getMetadata('required_permissions', WorkshopJobsController)).toEqual([WORKSHOP_MANAGE_PERMISSION]);
  });
});
