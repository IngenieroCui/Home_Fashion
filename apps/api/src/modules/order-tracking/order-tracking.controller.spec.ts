import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { ORDER_MANAGE_PERMISSION } from '../orders/orders.types';
import { AdminOrderTrackingController, PublicOrderTrackingController } from './order-tracking.controller';

describe('Order tracking controller security', () => {
  it('protects all administrative endpoints with ORDER_MANAGE', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminOrderTrackingController)).toEqual([JwtAuthGuard, PermissionsGuard]);
    expect(Reflect.getMetadata('required_permissions', AdminOrderTrackingController)).toEqual([ORDER_MANAGE_PERMISSION]);
  });

  it('keeps public tracking free of JWT guards', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, PublicOrderTrackingController)).toBeUndefined();
  });
});
