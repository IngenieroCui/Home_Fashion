import { BadRequestException } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuoteStatus } from './quotes.types';

describe('QuotesService transitions', () => {
  it('loads the newly created quote after the write transaction commits', async () => {
    const transaction = {};
    let committed = false;
    const quote = { id: '1', deliveryFee: '0.00', update: jest.fn(), get: () => ({ id: '1' }) };
    const quotes = { sequelize: { transaction: async (callback: (t: object) => Promise<unknown>) => { const result = await callback(transaction); committed = true; return result; } }, create: jest.fn().mockResolvedValue(quote), findByPk: jest.fn(async () => { expect(committed).toBe(true); return quote; }) };
    const service = new QuotesService({ findByPk: jest.fn().mockResolvedValue({ id: '2' }) } as never, quotes as never, { findAll: jest.fn().mockResolvedValue([]) } as never, {} as never, {} as never, {} as never);
    await expect(service.createQuote({ customerId: '2' }, '3')).resolves.toEqual({ id: '1' });
    expect(quotes.findByPk).toHaveBeenCalledWith('1', expect.objectContaining({ transaction: undefined }));
  });
  it('rejects arbitrary state transitions without a database', async () => {
    const quote = { id: '1', status: QuoteStatus.ACCEPTED };
    const service = new QuotesService({} as never, { findByPk: jest.fn().mockResolvedValue(quote) } as never, {} as never, {} as never, {} as never, {} as never);
    await expect(service.changeStatus('1', QuoteStatus.DRAFT, '1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects header edits after a quote has been quoted', async () => {
    const quote = { id: '1', status: QuoteStatus.QUOTED };
    const service = new QuotesService({} as never, { findByPk: jest.fn().mockResolvedValue(quote) } as never, {} as never, {} as never, {} as never, {} as never);
    await expect(service.updateQuote('1', { internalNotes: 'No editar' }, '1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
