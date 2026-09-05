import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreatePublicQuoteRequestDto } from './public-quote-request.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const valid = {
  requestId: '19d4bcf0-4307-4b1c-b3f4-61d2ecafdcec',
  fullName: 'Ana Pérez',
  phone: '+57 300 123 4567',
  email: 'ANA@EXAMPLE.COM',
  productId: '1',
  productVariantId: '2',
  quantity: 1,
  customization: { color: 'Arena' },
  message: 'Quisiera conocer el tiempo de entrega.'
};

const transform = (value: unknown) =>
  pipe.transform(value, { type: 'body', metatype: CreatePublicQuoteRequestDto });

describe('CreatePublicQuoteRequestDto', () => {
  it('normalizes bounded public contact and identifier fields', async () => {
    const result = await transform({
      ...valid,
      fullName: '  Ana Pérez ',
      email: ' ANA@EXAMPLE.COM '
    });
    expect(result).toMatchObject({ fullName: 'Ana Pérez', email: 'ana@example.com', quantity: 1 });
  });

  it.each([
    'unitListPrice',
    'unitQuotedPrice',
    'deliveryFee',
    'discount',
    'total',
    'estimatedCost',
    'status'
  ])('rejects the non-whitelisted financial or internal field %s', async (field) => {
    await expect(transform({ ...valid, [field]: 1 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-whitelisted fields nested in customization', async () => {
    await expect(
      transform({ ...valid, customization: { color: 'Arena', cost: 1 } })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    { field: 'email', value: 'not-an-email' },
    { field: 'requestId', value: 'not-a-uuid' },
    { field: 'phone', value: 'abc' },
    { field: 'phone', value: '.......' },
    { field: 'quantity', value: 0 },
    { field: 'quantity', value: 21 },
    { field: 'productId', value: '-1' },
    { field: 'message', value: 'a'.repeat(1001) }
  ])('rejects invalid or excessive $field values', async ({ field, value }) => {
    await expect(transform({ ...valid, [field]: value })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });
});
