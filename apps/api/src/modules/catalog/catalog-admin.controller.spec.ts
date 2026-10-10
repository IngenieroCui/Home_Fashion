import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { CatalogAdminController } from './catalog-admin.controller';
import { CATALOG_MANAGE_PERMISSION } from './catalog-admin.types';

describe('CatalogAdminController security', () => {
  it.each(['getProduct', 'createVariant', 'updateVariant'])('omits catalog cost from %s for a manager without cost-view permission', async (method) => {
    const payload = { estimatedCost: '100.00', variants: [{ estimatedCost: '200.00', quantityReserved: 1 }], created_at: new Date('2026-09-29T00:00:00Z') };
    const catalog = { getProduct: jest.fn().mockResolvedValue(payload), createVariant: jest.fn().mockResolvedValue(payload), updateVariant: jest.fn().mockResolvedValue(payload) };
    const auth = { getAuthenticatedUser: jest.fn().mockResolvedValue({ permissions: ['CATALOG_MANAGE'] }) };
    const controller = new CatalogAdminController(catalog as never, {} as never, auth as never);
    const result = method === 'getProduct' ? await controller.getProduct({ id: '1' }, { id: 'QA' }) : method === 'createVariant' ? await controller.createVariant({ productId: '1' }, {} as never, { id: 'QA' }) : await controller.updateVariant({ id: '1' }, {}, { id: 'QA' });
    expect(JSON.stringify(result)).not.toContain('estimatedCost');
    expect(result).toMatchObject({ variants: [{ quantityReserved: 1 }], created_at: payload.created_at });
    auth.getAuthenticatedUser.mockResolvedValue({ permissions: ['CATALOG_MANAGE', 'FINANCIAL_COST_VIEW'] });
    await expect(controller.getProduct({ id: '1' }, { id: 'QA' })).resolves.toBe(payload);
  });
  it('requires authentication and CATALOG_MANAGE for every administrative endpoint', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CatalogAdminController)).toEqual([JwtAuthGuard, PermissionsGuard]);
    expect(Reflect.getMetadata('required_permissions', CatalogAdminController)).toEqual([CATALOG_MANAGE_PERMISSION]);
  });
});
