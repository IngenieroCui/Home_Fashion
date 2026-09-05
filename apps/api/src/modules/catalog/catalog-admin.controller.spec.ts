import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { CatalogAdminController } from './catalog-admin.controller';
import { CATALOG_MANAGE_PERMISSION } from './catalog-admin.types';

describe('CatalogAdminController security', () => {
  it('requires authentication and CATALOG_MANAGE for every administrative endpoint', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CatalogAdminController)).toEqual([JwtAuthGuard, PermissionsGuard]);
    expect(Reflect.getMetadata('required_permissions', CatalogAdminController)).toEqual([CATALOG_MANAGE_PERMISSION]);
  });
});
