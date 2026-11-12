import { ValidationPipe } from '@nestjs/common';
import { CreateVariantDto, UpdateVariantDto } from './catalog-admin.dto';
describe('Administrative variant reservations', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  it.each([CreateVariantDto, UpdateVariantDto])('rejects quantityReserved on %p', async (metatype) => {
    await expect(pipe.transform({ sku: 'QA', salePrice: 1, quantityOnHand: 1, quantityReserved: 0 }, { type: 'body', metatype })).rejects.toMatchObject({ response: { statusCode: 400, message: expect.arrayContaining(['property quantityReserved should not exist']) } });
  });
});
