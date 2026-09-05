import { BadRequestException } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuoteStatus } from './quotes.types';

describe('QuotesService transitions', () => {
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
