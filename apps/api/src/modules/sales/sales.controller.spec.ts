import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { SalesController } from './sales.controller';
import { PAYMENT_CORRECT_PERMISSION, PAYMENT_REGISTER_PERMISSION } from './sales.types';

describe('SalesController payment security', () => {
  it('protects payment registration and voiding with their specific permissions', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, SalesController)).toEqual([
      JwtAuthGuard,
      PermissionsGuard
    ]);
    expect(Reflect.getMetadata('required_permissions', SalesController.prototype.registerPayment)).toEqual([
      PAYMENT_REGISTER_PERMISSION
    ]);
    expect(Reflect.getMetadata('required_permissions', SalesController.prototype.voidPayment)).toEqual([
      PAYMENT_CORRECT_PERMISSION
    ]);
  });
});
