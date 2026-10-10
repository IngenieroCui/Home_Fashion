import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateQuoteDto } from '../quotes/dto/quotes.dto';
import { CreateSaleDto } from './dto/sales.dto';
import { UpdateVariantDto } from '../catalog/dto/catalog-admin.dto';
import { QuotesService } from '../quotes/quotes.service';
import { SalesService } from './sales.service';

describe('QA monetary database bounds', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  it.each([
    [CreateQuoteDto, { customerId: '1', items: [{ productId: '1', quantity: 1, unitQuotedPrice: 1e20 }] }],
    [CreateSaleDto, { customerId: '1', items: [{ productId: '1', quantity: 1, unitSalePrice: '100000000000000000000.00' }] }],
    [UpdateVariantDto, { salePrice: 1e20 }]
  ])('rejects an input price outside DECIMAL(12,2)', async (metatype, body) => {
    await expect(pipe.transform(body, { type: 'body', metatype: metatype as never })).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each(['0.01', '999999.99', '1234567.89'])('retains a valid cent-based price %s', async (unitSalePrice) => {
    const dto = await pipe.transform({ customerId: 1, items: [{ productId: 1, quantity: 1, unitSalePrice }] }, { type: 'body', metatype: CreateSaleDto });
    expect(dto.items[0].unitSalePrice).toBe(unitSalePrice);
  });
  it('rejects a quote total overflow before persisting the aggregate', async () => {
    const items = { findAll: jest.fn().mockResolvedValue([{ subtotal: '9999999999.99', discountAmount: '0.00' }]) };
    const quote = { id: 'QA', deliveryFee: '0.01', update: jest.fn() };
    const service = new QuotesService({} as never, {} as never, items as never, {} as never, {} as never, {} as never);
    await expect(service['recalculate'](quote as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(quote.update).not.toHaveBeenCalled();
  });
  it('rejects a sale line overflow before creating its item', async () => {
    const items = { create: jest.fn() };
    const product = { id: '1', name: 'QA', allowsCustomization: true };
    const service = new SalesService({} as never, items as never, {} as never, {} as never, {} as never, {} as never, { findByPk: jest.fn().mockResolvedValue(product) } as never, {} as never, { resolvePrimaryImageUrl: jest.fn() } as never, {} as never);
    await expect(service['createDirectItem']({ id: 'QA' } as never, { productId: '1', quantity: 2, unitSalePrice: '9999999999.99' }, 'QA', {} as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(items.create).not.toHaveBeenCalled();
  });
});
