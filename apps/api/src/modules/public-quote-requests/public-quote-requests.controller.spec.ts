import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PublicQuoteRequestsController } from './public-quote-requests.controller';

describe('PublicQuoteRequestsController', () => {
  it('is public and delegates the bounded DTO without JWT guards', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ received: true, requestCode: 'HF-SOL-2026-00001', status: 'REQUESTED' });
    const controller = new PublicQuoteRequestsController({ create } as never);
    const dto = {
      requestId: '19d4bcf0-4307-4b1c-b3f4-61d2ecafdcec',
      fullName: 'Ana Pérez',
      phone: '3001234567',
      productId: '1',
      productVariantId: '2',
      quantity: 1
    };
    expect(Reflect.getMetadata(GUARDS_METADATA, PublicQuoteRequestsController)).toBeUndefined();
    await expect(controller.create(dto)).resolves.toEqual({
      received: true,
      requestCode: 'HF-SOL-2026-00001',
      status: 'REQUESTED'
    });
    expect(create).toHaveBeenCalledWith(dto);
  });
});
