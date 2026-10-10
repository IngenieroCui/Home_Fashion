import type { Connection, RowDataPacket } from 'mysql2/promise';
import { required } from './environment';

// Direct sale, mixed order and recovery each reserve one unit. The other
// two scenarios manufacture their items and consume no stock units.
export const SUITE_STOCK_REQUIRED = 3;
export function assertSuiteStock(onHand: number, reserved: number) {
  const available = onHand - reserved;
  if (!Number.isSafeInteger(onHand) || !Number.isSafeInteger(reserved)
    || onHand < 0 || reserved < 0 || available < SUITE_STOCK_REQUIRED) {
    throw new Error(`BLOQUEADO: inventario E2E insuficiente (${available} disponibles; se requieren ${SUITE_STOCK_REQUIRED}). `
      + 'Detén con pnpm test:e2e:stop, conserva .env.e2e y owner.json en el runtime ignorado y provisiona otra instancia con pnpm test:e2e:provision; ver tests/e2e/README.md. No ajustes reservas ni borres ventas/pedidos por SQL.');
  }
  return available;
}
export async function checkSuiteStock(db: Connection) {
  const [variants] = await db.execute<RowDataPacket[]>(`SELECT v.quantity_on_hand, v.quantity_reserved
    FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE p.slug = ? AND v.sku = ? AND p.status = 'ACTIVE' AND v.status = 'ACTIVE'`,
  [`qa-mueble-${required('E2E_RUN_ID')}`, `QA-STOCK-${required('E2E_RUN_ID')}`]);
  if (variants.length !== 1) throw new Error('BLOQUEADO: catálogo de inventario E2E ausente o ambiguo.');
  return assertSuiteStock(Number(variants[0].quantity_on_hand), Number(variants[0].quantity_reserved));
}
