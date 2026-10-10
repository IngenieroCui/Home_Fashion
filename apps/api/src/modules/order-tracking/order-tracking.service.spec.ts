import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { OrderTrackingService } from './order-tracking.service';

describe('OrderTrackingService', () => {
  const now = new Date('2026-08-06T12:00:00.000Z');
  const dates = { createdAt: now, expiresAt: null, rotatedAt: null, revokedAt: null };

  function access(values: Record<string, unknown> = {}) {
    const model = {
      id: '4',
      orderId: '1',
      tokenHash: 'old',
      tokenPrefix: 'oldprefix',
      active: true,
      createdByUserId: 'user-1',
      revokedByUserId: null,
      ...dates,
      ...values
    } as unknown as Record<string, unknown> & { update: jest.Mock; get: jest.Mock };
    const suppliedGet = values.get as (() => Record<string, unknown>) | undefined;
    model.update = jest.fn(async (updates) => Object.assign(model, updates));
    model.get = jest.fn(() =>
      suppliedGet ? suppliedGet() : { ...model, update: undefined, get: undefined }
    );
    return model;
  }

  function setup(
    options: {
      existing?: ReturnType<typeof access> | null;
      publicAccess?: ReturnType<typeof access> | null;
      permissions?: string[];
      delivery?: { status: string; getDataValue: (key: string) => unknown };
    } = {}
  ) {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const accesses = {
      sequelize: { transaction: jest.fn(async (callback) => callback(transaction)) },
      findOne: jest.fn(async (query) =>
        query.include ? (options.publicAccess ?? null) : (options.existing ?? null)
      ),
      create: jest.fn(async (values) => access(values))
    };
    const orders = { findByPk: jest.fn(async (): Promise<{ id: string } | null> => ({ id: '1' })) };
    const auth = {
      getAuthenticatedUser: jest.fn(async () => ({
        permissions: options.permissions ?? ['ORDER_MANAGE']
      }))
    };
    return {
      service: new OrderTrackingService(
        accesses as never,
        orders as never,
        { findOne: jest.fn().mockResolvedValue(options.delivery ?? null) } as never,
        auth as never
      ),
      accesses,
      orders,
      auth
    };
  }

  beforeEach(() => jest.useFakeTimers().setSystemTime(now));
  afterEach(() => jest.useRealTimers());

  it('creates a 32-byte random base64url token, stores only its SHA-256 hash and returns the public path', async () => {
    const { service, accesses } = setup();
    const result = await service.createOrRotate('1', {}, 'user-1');
    expect(Buffer.from(result.token, 'base64url')).toHaveLength(32);
    expect(accesses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: '1',
        tokenHash: createHash('sha256').update(result.token).digest('hex'),
        tokenPrefix: result.token.slice(0, 8),
        active: true
      }),
      expect.anything()
    );
    expect(accesses.create.mock.calls[0][0]).not.toHaveProperty('token');
    expect(result).toEqual(
      expect.objectContaining({ path: `/seguimiento/${result.token}`, active: true })
    );
  });

  it('rotates an existing access, invalidates its old hash and clears revocation metadata', async () => {
    const existing = access({
      tokenHash: 'old-hash',
      active: false,
      revokedAt: now,
      revokedByUserId: 'admin-2'
    });
    const { service } = setup({ existing });
    const result = await service.createOrRotate(
      '1',
      { expiresAt: '2026-08-07T12:00:00.000Z' },
      'user-1'
    );
    expect(existing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        active: true,
        revokedAt: null,
        revokedByUserId: null,
        expiresAt: new Date('2026-08-07T12:00:00.000Z')
      }),
      expect.anything()
    );
    expect(existing.tokenHash).toBe(createHash('sha256').update(result.token).digest('hex'));
    expect(existing.tokenHash).not.toBe('old-hash');
    expect(result).toHaveProperty('rotatedAt');
  });

  it('returns administrative status without token or token hash, and handles absent access without error', async () => {
    const populated = setup({ existing: access() });
    await expect(populated.service.status('1', 'user-1')).resolves.toEqual(
      expect.objectContaining({ exists: true, active: true, tokenPrefix: 'oldprefix' })
    );
    const status = await populated.service.status('1', 'user-1');
    expect(status).not.toHaveProperty('token');
    expect(status).not.toHaveProperty('tokenHash');
    await expect(setup().service.status('1', 'user-1')).resolves.toEqual({
      exists: false,
      active: false
    });
  });

  it('revokes once and is idempotent for an already revoked access', async () => {
    const existing = access();
    const { service } = setup({ existing });
    await expect(service.revoke('1', 'user-1')).resolves.toEqual(
      expect.objectContaining({ active: false, revokedAt: expect.any(Date) })
    );
    expect(existing.update).toHaveBeenCalledTimes(1);
    await service.revoke('1', 'user-1');
    expect(existing.update).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['missing access', null, NotFoundException],
    ['missing order', undefined, NotFoundException]
  ])('rejects revocation for %s', async (_name, existing, exception) => {
    const state = setup({ existing: existing as ReturnType<typeof access> | null });
    if (existing === undefined) state.orders.findByPk.mockResolvedValue(null);
    await expect(state.service.revoke('1', 'user-1')).rejects.toBeInstanceOf(exception);
  });

  it.each(['2026-08-06T12:00:00.000Z', 'invalid-date'])(
    'rejects an invalid or non-future expiration: %s',
    async (expiresAt) => {
      await expect(
        setup().service.createOrRotate('1', { expiresAt }, 'user-1')
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  );

  it('requires ORDER_MANAGE for administrative operations', async () => {
    await expect(setup({ permissions: [] }).service.status('1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it('returns only safe order fields and approved timeline reports, ordered by submittedAt then id', async () => {
    const publicAccess = access({
      tokenHash: 'hash',
      get: () => ({
        ...dates,
        order: {
          code: 'HF-PED-2026-00001',
          updatedAt: new Date('2030-01-01T00:00:00Z'),
          status: 'IN_PROGRESS',
          promisedDate: '2026-09-01',
          createdAt: now,
          customerId: 'customer-1',
          saleId: 'sale-1',
          notes: 'internal',
          items: [
            {
              id: 'item-1',
              productNameSnapshot: 'Sofá',
              variantNameSnapshot: null,
              skuSnapshot: 'SOFA-1',
              customization: { fabric: 'Lino', empty: '', none: null },
              quantity: 1,
              supplyType: 'MADE_TO_ORDER',
              status: 'IN_PRODUCTION',
              workshopJob: {
                expectedCompletionDate: '2026-09-10',
                workshopUser: { fullName: 'Hidden' },
                progressReports: [
                  {
                    id: '2',
                    type: 'PROGRESS',
                    message: 'Segundo',
                    progressPercent: 50,
                    evidenceUrls: ['https://evidence/2'],
                    submittedAt: '2026-08-02T00:00:00.000Z',
                    reviewedAt: '2026-08-03T00:00:00.000Z',
                    reviewComment: 'hidden'
                  },
                  {
                    id: '1',
                    type: 'STARTED',
                    message: 'Primero',
                    progressPercent: 1,
                    evidenceUrls: [],
                    submittedAt: '2026-08-02T00:00:00.000Z',
                    reviewedAt: null,
                    reviewStatus: 'APPROVED'
                  }
                ]
              }
            },
            {
              id: 'item-2',
              productNameSnapshot: 'En inventario',
              variantNameSnapshot: null,
              skuSnapshot: null,
              customization: null,
              quantity: 2,
              supplyType: 'IN_STOCK',
              status: 'RESERVED',
              workshopJob: null
            }
          ]
        }
      })
    });
    const { service, accesses } = setup({ publicAccess });
    const token = Buffer.alloc(32, 7).toString('base64url');
    const result = await service.publicLookup(token);
    expect(accesses.findOne).toHaveBeenCalledTimes(1);
    expect(accesses.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tokenHash: createHash('sha256').update(token).digest('hex'), active: true }
      })
    );
    expect(result).toEqual(
      expect.objectContaining({ orderCode: 'HF-PED-2026-00001', orderStatus: 'IN_PROGRESS' })
    );
    expect(result.lastPublicUpdateAt).not.toEqual('2030-01-01T00:00:00.000Z');
    expect(result).not.toHaveProperty('customerId');
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        customization: { fabric: 'Lino' },
        expectedCompletionDate: '2026-09-10'
      })
    );
    expect(result.items[0]).not.toHaveProperty('publicItemId');
    expect(result.items[0]).not.toHaveProperty('id');
    expect(result.items[0].publicItemKey).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(result.items[0].publicItemKey).not.toEqual(result.items[1].publicItemKey);
    expect(result.items[0].timeline.map((report) => report.message)).toEqual([
      'Primero',
      'Segundo'
    ]);
    expect(JSON.stringify(result)).not.toContain('reviewComment');
    expect(JSON.stringify(result)).not.toContain('workshopUser');
    expect(result.items[1]).toEqual(
      expect.objectContaining({ expectedCompletionDate: null, timeline: [] })
    );
  });

  it.each(['OUT_FOR_DELIVERY', 'SCHEDULED', 'DELIVERED', 'CANCELLED'])('uses the public delivery event timestamp for %s', async (status) => {
    const eventAt = new Date('2026-08-06T12:10:00.000Z');
    const publicAccess = access({ get: () => ({ order: { code: 'QA', status: 'READY', createdAt: now, updatedAt: '2030-01-01', items: [] } }) });
    const delivery = { status, getDataValue: (key: string) => key === 'updatedAt' ? eventAt : now };
    const result = await setup({ publicAccess, delivery }).service.publicLookup(Buffer.alloc(32, 7).toString('base64url'));
    expect(result.lastPublicUpdateAt).toBe(eventAt.toISOString());
    if (status === 'CANCELLED') expect(result.delivery).toBeNull();
  });

  it('never exposes financial, internal or nested data supplied through customization', async () => {
    const publicAccess = access({
      get: () => ({
        ...dates,
        order: {
          code: 'HF-PED-TEST',
          status: 'OPEN',
          createdAt: now,
          items: [
            {
              id: '1',
              quantity: 1,
              customization: {
                color: 'Arena',
                details: 'Acabado mate',
                seats: 3,
                estimatedCost: '900000',
                customer: { phone: 'private' },
                internalNotes: 'internal',
                fabric: { cost: 'hidden' },
                finish: ''
              }
            }
          ]
        }
      })
    });
    const result = await setup({ publicAccess }).service.publicLookup(
      Buffer.alloc(32, 7).toString('base64url')
    );
    expect(result.items[0].customization).toEqual({
      color: 'Arena',
      details: 'Acabado mate',
      seats: 3
    });
    expect(JSON.stringify(result)).not.toMatch(/estimatedCost|private|internal|hidden/);
  });

  it('uses an approved-only report association and rejects malformed, missing, revoked, or expired public tokens generically', async () => {
    const missing = setup();
    await expect(missing.service.publicLookup('short')).rejects.toBeInstanceOf(BadRequestException);
    const token = Buffer.alloc(32, 9).toString('base64url');
    await expect(missing.service.publicLookup(token)).rejects.toBeInstanceOf(NotFoundException);
    const expired = setup({
      publicAccess: access({ expiresAt: new Date('2026-08-06T11:59:59.000Z') })
    });
    await expect(expired.service.publicLookup(token)).rejects.toBeInstanceOf(NotFoundException);
    const include =
      expired.accesses.findOne.mock.calls[0][0].include[0].include[0].include[0].include[0];
    expect(include.where).toEqual({ reviewStatus: 'APPROVED' });
  });
});
