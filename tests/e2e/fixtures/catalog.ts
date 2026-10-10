import type { Connection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { required } from '../support/environment';
import { rows } from './database';

export async function seedCatalog(db: Connection) {
  const suffix = required('E2E_RUN_ID');
  const [existing] = await db.execute<RowDataPacket[]>('SELECT id FROM products WHERE slug = ?', [`qa-mueble-${suffix}`]);
  if (existing.length) return;
  const [category] = await db.execute<ResultSetHeader>(`INSERT INTO categories
    (name, slug, is_active, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())`, ['QA E2E', `qa-e2e-${suffix}`]);
  const [product] = await db.execute<ResultSetHeader>(`INSERT INTO products
    (category_id, name, slug, description, allows_customization, status, created_at, updated_at)
    VALUES (?, ?, ?, 'Mueble sintético de prueba E2E', 0, 'ACTIVE', NOW(), NOW())`,
  [category.insertId, `QA Mueble ${suffix}`, `qa-mueble-${suffix}`]);
  for (const [name, stock] of [['Inventario QA', 20], ['Fabricación QA', 0]] as const) {
    await db.execute(`INSERT INTO product_variants (product_id, sku, name, sale_price, estimated_cost,
      quantity_on_hand, location, status, created_at, updated_at) VALUES (?, ?, ?, '250000.00', '100000.00', ?, 'E2E', 'ACTIVE', NOW(), NOW())`,
    [product.insertId, `QA-${stock ? 'STOCK' : 'MAKE'}-${suffix}`, name, stock]);
  }
}
export async function catalog() {
  const products = await rows('SELECT id, name, slug FROM products WHERE slug = ?', [`qa-mueble-${required('E2E_RUN_ID')}`]);
  if (products.length !== 1) throw new Error('Falta el catálogo del run E2E.');
  const variants = await rows('SELECT id, name, sku, sale_price, quantity_reserved FROM product_variants WHERE product_id = ? ORDER BY id', [products[0].id]);
  return { product: products[0], stock: variants[0], make: variants[1] };
}
