import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { OrdersController } from './orders.controller';
import { ORDER_MANAGE_PERMISSION } from './orders.types';

describe('OrdersController security', () => {
  it('protects the three order endpoints with ORDER_MANAGE', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, OrdersController)).toEqual([JwtAuthGuard, PermissionsGuard]);
    expect(Reflect.getMetadata('required_permissions', OrdersController)).toEqual([ORDER_MANAGE_PERMISSION]);
  });
});
