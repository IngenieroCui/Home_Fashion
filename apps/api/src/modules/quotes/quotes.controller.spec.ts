import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { QuotesController } from './quotes.controller';

describe('QuotesController security', () => {
  it('protects administrative customer and quote routes with JWT and permissions', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, QuotesController)).toEqual([JwtAuthGuard, PermissionsGuard]);
  });
});
