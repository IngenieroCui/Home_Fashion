import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateSaleDto, RegisterSalePaymentDto, SaleItemInputDto } from './sales.dto';

describe('sale money input validation', () => {
  it('accepts decimal prices, delivery fees, and payments', () => {
    const item = plainToInstance(SaleItemInputDto, { productId: '1', quantity: 1, unitSalePrice: '3299000.00' });
    const sale = plainToInstance(CreateSaleDto, { customerId: '1', items: [{ productId: '1', quantity: 1, unitSalePrice: '3299000.00' }], deliveryFee: '50000.50' });
    const payment = plainToInstance(RegisterSalePaymentDto, { type: 'DEPOSIT', method: 'BANK_TRANSFER', amount: '100000.00', paidAt: '2026-09-28T12:00:00.000Z' });

    expect(validateSync(item)).toEqual([]);
    expect(validateSync(sale)).toEqual([]);
    expect(validateSync(payment)).toEqual([]);
  });

  it('rejects money with more than two decimal places', () => {
    const payment = plainToInstance(RegisterSalePaymentDto, { type: 'DEPOSIT', method: 'BANK_TRANSFER', amount: '100.001', paidAt: '2026-09-28T12:00:00.000Z' });
    expect(validateSync(payment).some((error) => error.property === 'amount')).toBe(true);
  });
});
