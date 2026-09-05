import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { DeliveriesController } from './deliveries.controller';
import { DELIVERY_MANAGE_PERMISSION } from './deliveries.types';

describe('DeliveriesController security', () => {
  it('protects every delivery endpoint with JWT and ORDER_MANAGE', () => {
    expect(DELIVERY_MANAGE_PERMISSION).toBe('ORDER_MANAGE');
    expect(Reflect.getMetadata(GUARDS_METADATA, DeliveriesController)).toEqual([JwtAuthGuard, PermissionsGuard]);
    expect(Reflect.getMetadata('required_permissions', DeliveriesController)).toEqual(['ORDER_MANAGE']);
  });
});
