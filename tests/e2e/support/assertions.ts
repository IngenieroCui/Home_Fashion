import { expect } from '@playwright/test';
import { rows } from '../fixtures/database';

export async function linkedChain(ids: Record<string, string>) {
  const chain = await rows(`SELECT q.id quote_id, q.code request_code, q.status quote_status,
    q.public_request_key request_id, q.customer_id quote_customer_id,
    s.id sale_id, s.customer_id, s.quote_id sale_quote_id, o.id order_id, o.sale_id order_sale_id, o.customer_id order_customer_id,
    o.status order_status, d.id delivery_id, d.status delivery_status,
    j.id job_id, j.status job_status, r.id report_id, r.review_status,
    r.evidence_urls report_evidence, d.evidence_urls delivery_evidence
    FROM quotes q JOIN sales s ON s.quote_id=q.id JOIN orders o ON o.sale_id=s.id
    JOIN order_items oi ON oi.order_id=o.id JOIN workshop_jobs j ON j.order_item_id=oi.id
    JOIN workshop_progress_reports r ON r.workshop_job_id=j.id
    JOIN deliveries d ON d.order_id=o.id WHERE q.id=? AND r.id=?`, [ids.quoteId, ids.reportId]);
  expect(chain).toHaveLength(1);
  expect(String(chain[0].sale_id)).toBe(ids.saleId);
  expect(String(chain[0].order_id)).toBe(ids.orderId);
  expect(String(chain[0].job_id)).toBe(ids.jobId);
  expect(String(chain[0].delivery_id)).toBe(ids.deliveryId);
  expect(chain[0].request_id).toBe(ids.requestId);
  expect(String(chain[0].quote_customer_id)).toBe(String(chain[0].customer_id));
  expect(String(chain[0].customer_id)).toBe(String(chain[0].order_customer_id));
  expect(chain[0].report_evidence).toHaveLength(1);
  expect(chain[0].delivery_evidence).toHaveLength(1);
  for (const url of [...chain[0].report_evidence, ...chain[0].delivery_evidence])
    expect(url).toContain(`/home-fashion-e2e/${process.env.E2E_RUN_ID}/`);
  expect(chain[0]).toMatchObject({ request_code: ids.requestCode, quote_status: 'ACCEPTED',
    order_status: 'COMPLETED', delivery_status: 'DELIVERED', job_status: 'COMPLETED', review_status: 'APPROVED' });
  const payments = await rows('SELECT id, sale_id, amount, type FROM sale_payments WHERE sale_id=?', [ids.saleId]);
  expect(payments).toHaveLength(1);
  expect(String(payments[0].id)).toBe(ids.paymentId);
  expect(Number(payments[0].amount)).toBe(50000);
  const items = await rows(`SELECT qi.product_id, qi.product_variant_id, qi.product_name_snapshot quote_name,
    si.product_variant_id sale_variant, oi.product_variant_id order_variant, qi.quantity quote_quantity,
    si.quantity sale_quantity, oi.quantity order_quantity,
    si.product_name_snapshot sale_name, oi.product_name_snapshot order_name, oi.status
    FROM quote_items qi JOIN sale_items si ON si.sale_id=? AND si.product_id=qi.product_id
    JOIN order_items oi ON oi.sale_item_id=si.id WHERE qi.quote_id=?`, [ids.saleId, ids.quoteId]);
  expect(items).toHaveLength(1);
  expect(items[0].quote_name).toBe(items[0].sale_name);
  expect(items[0].sale_name).toBe(items[0].order_name);
  expect(String(items[0].product_variant_id)).toBe(String(items[0].sale_variant));
  expect(String(items[0].sale_variant)).toBe(String(items[0].order_variant));
  expect(items[0].quote_quantity).toBe(items[0].sale_quantity);
  expect(items[0].sale_quantity).toBe(items[0].order_quantity);
  expect(items[0].status).toBe('DELIVERED');
  return { chain, payments, items };
}
export function publicProjection(value: Record<string, any>, approved: string[], hidden: string[]) {
  expect(Object.keys(value).sort()).toEqual(['createdAt', 'delivery', 'items', 'lastPublicUpdateAt', 'orderCode', 'orderStatus', 'promisedDate'].sort());
  const prohibited = new Set(['id', 'orderId', 'saleId', 'customerId', 'workshopUserId', 'email', 'phone', 'address',
    'balance', 'total', 'estimatedCost', 'unitSalePrice', 'internalNotes', 'passwordHash', 'tokenHash', 'token', 'accessToken', 'refreshToken']);
  const inspect = (entry: unknown) => {
    if (!entry || typeof entry !== 'object') return;
    for (const [key, child] of Object.entries(entry)) { expect(prohibited.has(key), `Campo privado ${key}`).toBe(false); inspect(child); }
  };
  inspect(value);
  const messages = value.items.flatMap((item: any) => item.timeline.map((entry: any) => entry.message));
  expect(messages.sort()).toEqual([...approved].sort());
  for (const message of hidden) expect(JSON.stringify(value)).not.toContain(message);
}
