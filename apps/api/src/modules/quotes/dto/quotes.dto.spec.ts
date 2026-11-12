import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuoteItemParamDto } from './quotes.dto';

describe('Quote item route parameters', () => {
  it('accepts the quote and item identifiers present in the edit route', async () => {
    const dto = plainToInstance(QuoteItemParamDto, { quoteId: '34', itemId: '33' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('still rejects a missing item identifier', async () => {
    const dto = plainToInstance(QuoteItemParamDto, { quoteId: '34' });
    expect((await validate(dto)).map(error => error.property)).toContain('itemId');
  });
});
