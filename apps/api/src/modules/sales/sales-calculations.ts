export const cents = (value: string | number) => {
  const raw = String(value).trim();
  const sign = raw.startsWith('-') ? -1n : 1n;
  const unsigned = raw.replace(/^[+-]/, '');
  const [whole, decimal = ''] = unsigned.split('.');
  return sign * (BigInt(whole) * 100n + BigInt((decimal + '00').slice(0, 2)));
};

export const money = (value: bigint) => {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
};

export function calculateSaleItem(
  unitListPrice: string | null,
  unitSalePrice: string,
  quantity: number
) {
  const list = unitListPrice === null ? null : cents(unitListPrice);
  const sale = cents(unitSalePrice);
  const amount = BigInt(quantity);
  return {
    discountAmount: money(list !== null && list > sale ? (list - sale) * amount : 0n),
    subtotal: money(sale * amount)
  };
}

export function calculateSaleTotals(
  items: Array<{ subtotal: string; discountAmount: string }>,
  deliveryFee: string
) {
  const subtotal = items.reduce((sum, item) => sum + cents(item.subtotal), 0n);
  const discountTotal = items.reduce((sum, item) => sum + cents(item.discountAmount), 0n);
  return {
    subtotal: money(subtotal),
    discountTotal: money(discountTotal),
    total: money(subtotal + cents(deliveryFee))
  };
}

type PaymentMovement = {
  type: string;
  amount: string;
  adjustmentEffect?: string | null;
};

export function calculatePaymentSummary(
  payments: PaymentMovement[],
  total: string
): { amountPaid: string; balance: string; paymentStatus: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' } {
  const totalCents = cents(total);
  const amountPaidCents = payments.reduce((sum, payment) => {
    const amount = cents(payment.amount);
    if (['DEPOSIT', 'PAYMENT', 'FINAL_PAYMENT'].includes(payment.type)) return sum + amount;
    if (payment.type === 'REFUND') return sum - amount;
    if (payment.type === 'ADJUSTMENT')
      return payment.adjustmentEffect === 'ADD_TO_PAID' ? sum + amount : sum - amount;
    return sum;
  }, 0n);
  const paymentStatus =
    amountPaidCents === 0n
      ? 'PENDING'
      : amountPaidCents === totalCents
        ? 'PAID'
        : 'PARTIALLY_PAID';
  return {
    amountPaid: money(amountPaidCents),
    balance: money(totalCents - amountPaidCents),
    paymentStatus
  };
}
