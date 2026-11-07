import * as bcrypt from 'bcryptjs';
import { QueryTypes, type Transaction } from 'sequelize';
import { createStandaloneConnection } from './standalone.connection';

// This command is deliberately outside Umzug's normal seeder glob.
async function main(): Promise<void> {
  const { sequelize, config } = await createStandaloneConnection();
  try {
    if (
      config.database !== 'home_fashion_demo' ||
      process.env.DEMO_CONFIRM_DATABASE !== config.database
    ) {
      throw new Error(
        'Se requiere una base independiente llamada home_fashion_demo y DEMO_CONFIRM_DATABASE=home_fashion_demo.'
      );
    }
    const accounts = [
      {
        role: 'ADMIN',
        email: 'admin@demo.home-fashion.invalid',
        name: 'Administración Demo',
        password: process.env.DEMO_ADMIN_PASSWORD
      },
      {
        role: 'EMPLOYEE',
        email: 'empleado@demo.home-fashion.invalid',
        name: 'Empleado Demo',
        password: process.env.DEMO_EMPLOYEE_PASSWORD
      },
      {
        role: 'WORKSHOP',
        email: 'taller@demo.home-fashion.invalid',
        name: 'Taller Demo',
        password: process.env.DEMO_WORKSHOP_PASSWORD
      }
    ];
    if (
      accounts.some((account) => !account.password || account.password.length < 12) ||
      new Set(accounts.map((a) => a.password)).size !== 3
    ) {
      throw new Error(
        'Define tres contraseñas demo distintas de al menos 12 caracteres en el entorno.'
      );
    }
    await sequelize.transaction(async (transaction: Transaction) => {
      const query = (sql: string, replacements: Record<string, unknown> = {}) =>
        sequelize.query(sql, { replacements, transaction });
      const id = async (sql: string, replacements: Record<string, unknown>) => {
        const rows = await sequelize.query<{ id: number }>(sql, {
          replacements,
          transaction,
          type: QueryTypes.SELECT
        });
        if (!rows[0])
          throw new Error('Faltan datos base o migraciones; revisa las instrucciones de la demo.');
        return rows[0].id;
      };
      for (const account of accounts) {
        const roleId = await id('SELECT id FROM roles WHERE code = :code', { code: account.role });
        const existing = await sequelize.query<{ role_id: number }>(
          'SELECT role_id FROM users WHERE email = :email',
          { replacements: { email: account.email }, transaction, type: QueryTypes.SELECT }
        );
        if (existing.length && Number(existing[0].role_id) !== Number(roleId))
          throw new Error('La cuenta demo existente tiene un rol inesperado.');
        if (!existing.length) {
          const hash = await bcrypt.hash(account.password!, 12);
          await query(
            'INSERT INTO users (role_id, full_name, email, password_hash, is_active, created_at, updated_at) VALUES (:roleId, :name, :email, :hash, 1, NOW(), NOW())',
            { roleId, name: account.name, email: account.email, hash }
          );
        }
      }
      const admin = await id('SELECT id FROM users WHERE email = :email', {
        email: accounts[0].email
      });
      const workshop = await id('SELECT id FROM users WHERE email = :email', {
        email: accounts[2].email
      });
      const variant = await id('SELECT id FROM product_variants WHERE sku = :sku', {
        sku: 'NAP-Q-ARE'
      });
      const product = await id('SELECT product_id AS id FROM product_variants WHERE id = :id', {
        id: variant
      });
      await query(
        "INSERT INTO customers (full_name, document_type, document_number, phone, email, city, is_active, created_by_user_id, updated_by_user_id, created_at, updated_at) SELECT 'Cliente Ficticio Demo', 'OTHER', 'DEMO-CLIENTE-001', '0000000000', 'cliente@example.invalid', 'Ciudad Demo', 1, :admin, :admin, NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM customers WHERE document_number = 'DEMO-CLIENTE-001')",
        { admin }
      );
      const customer = await id('SELECT id FROM customers WHERE document_number = :document', {
        document: 'DEMO-CLIENTE-001'
      });
      await query(
        "INSERT INTO quotes (code, customer_id, status, subtotal, discount_total, delivery_fee, total, created_by_user_id, updated_by_user_id, created_at, updated_at) SELECT 'DEMO-COT-001', :customer, 'ACCEPTED', 2899000, 0, 0, 2899000, :admin, :admin, NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM quotes WHERE code = 'DEMO-COT-001')",
        { customer, admin }
      );
      const quote = await id('SELECT id FROM quotes WHERE code = :code', { code: 'DEMO-COT-001' });
      await query(
        "INSERT INTO quote_items (quote_id, product_id, product_variant_id, product_name_snapshot, variant_name_snapshot, sku_snapshot, quantity, unit_list_price, unit_quoted_price, discount_amount, subtotal, created_at, updated_at) SELECT :quote, :product, :variant, 'Cama Nápoles', 'Queen arena', 'NAP-Q-ARE', 1, 2899000, 2899000, 0, 2899000, NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM quote_items WHERE quote_id = :quote)",
        { quote, product, variant }
      );
      await query(
        "INSERT INTO sales (code, customer_id, quote_id, status, subtotal, discount_total, delivery_fee, total, created_by_user_id, created_at, updated_at) SELECT 'DEMO-VTA-001', :customer, :quote, 'CONFIRMED', 2899000, 0, 0, 2899000, :admin, NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM sales WHERE code = 'DEMO-VTA-001')",
        { customer, quote, admin }
      );
      const sale = await id('SELECT id FROM sales WHERE code = :code', { code: 'DEMO-VTA-001' });
      await query(
        "INSERT INTO sale_items (sale_id, product_id, product_variant_id, product_name_snapshot, variant_name_snapshot, sku_snapshot, quantity, unit_list_price, unit_sale_price, discount_amount, subtotal, is_below_cost, created_at, updated_at) SELECT :sale, :product, :variant, 'Cama Nápoles', 'Queen arena', 'NAP-Q-ARE', 1, 2899000, 2899000, 0, 2899000, 0, NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id = :sale)",
        { sale, product, variant }
      );
      const saleItem = await id('SELECT id FROM sale_items WHERE sale_id = :sale LIMIT 1', {
        sale
      });
      await query(
        "INSERT INTO orders (code, sale_id, customer_id, status, notes, created_by_user_id, created_at, updated_at) SELECT 'DEMO-PED-001', :sale, :customer, 'IN_PROGRESS', 'Pedido ficticio', :admin, NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM orders WHERE code = 'DEMO-PED-001')",
        { sale, customer, admin }
      );
      const order = await id('SELECT id FROM orders WHERE code = :code', { code: 'DEMO-PED-001' });
      await query(
        "INSERT INTO order_items (order_id, sale_item_id, product_id, product_variant_id, product_name_snapshot, variant_name_snapshot, sku_snapshot, quantity, supply_type, status, created_at, updated_at) SELECT :orderId, :saleItem, :product, :variant, 'Cama Nápoles', 'Queen arena', 'NAP-Q-ARE', 1, 'MADE_TO_ORDER', 'IN_PRODUCTION', NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE sale_item_id = :saleItem)",
        { orderId: order, saleItem, product, variant }
      );
      const orderItem = await id('SELECT id FROM order_items WHERE sale_item_id = :saleItem', {
        saleItem
      });
      await query(
        "INSERT INTO workshop_jobs (code, order_item_id, workshop_user_id, status, instructions, assigned_by_user_id, assigned_at, created_at, updated_at) SELECT 'DEMO-TAL-001', :orderItem, :workshop, 'IN_PROGRESS', 'Fabricación ficticia para demostración.', :admin, NOW(), NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM workshop_jobs WHERE order_item_id = :orderItem)",
        { orderItem, workshop, admin }
      );
    });
    console.info('Datos demo preparados. Las contraseñas de cuentas existentes no se modificaron.');
  } finally {
    await sequelize.close();
  }
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'No se pudo preparar la demo.');
  process.exitCode = 1;
});
