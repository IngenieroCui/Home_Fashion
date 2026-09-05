import type { DatabaseMigration } from '../migration.types';

const now = new Date();
export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.bulkInsert('categories', [
      { id: 1, name: 'Sofás', slug: 'sofas', description: 'Sofás para el hogar.', is_active: true, created_at: now, updated_at: now },
      { id: 2, name: 'Comedores', slug: 'comedores', description: 'Muebles para compartir.', is_active: true, created_at: now, updated_at: now },
      { id: 3, name: 'Dormitorios', slug: 'dormitorios', description: 'Muebles para descansar.', is_active: true, created_at: now, updated_at: now }
    ], { transaction });
    await context.bulkInsert('products', [
      { id: 1, category_id: 1, name: 'Sofá Verona', slug: 'sofa-verona', description: 'Sofá contemporáneo de tres puestos.', allows_customization: true, status: 'ACTIVE', created_at: now, updated_at: now },
      { id: 2, category_id: 2, name: 'Comedor Siena', slug: 'comedor-siena', description: 'Comedor de seis puestos.', allows_customization: false, status: 'ACTIVE', created_at: now, updated_at: now },
      { id: 3, category_id: 3, name: 'Cama Nápoles', slug: 'cama-napoles', description: 'Cama tapizada tamaño queen.', allows_customization: true, status: 'ACTIVE', created_at: now, updated_at: now }
    ], { transaction });
    await context.bulkInsert('product_variants', [
      { id: 1, product_id: 1, sku: 'VER-3P-GRI', name: 'Tres puestos gris', fabric: 'Lino', color: 'Gris', sale_price: 3299000, estimated_cost: 1900000, quantity_on_hand: 4, quantity_reserved: 0, location: 'Bodega A', status: 'ACTIVE', created_at: now, updated_at: now },
      { id: 2, product_id: 1, sku: 'VER-3P-BEI', name: 'Tres puestos beige', fabric: 'Lino', color: 'Beige', sale_price: 3299000, estimated_cost: null, quantity_on_hand: 2, quantity_reserved: 0, location: 'Bodega A', status: 'ACTIVE', created_at: now, updated_at: now },
      { id: 3, product_id: 2, sku: 'SIE-6P-NOG', name: 'Seis puestos nogal', material: 'Madera', sale_price: 4599000, estimated_cost: 2600000, quantity_on_hand: 1, quantity_reserved: 0, location: 'Bodega B', status: 'ACTIVE', created_at: now, updated_at: now },
      { id: 4, product_id: 3, sku: 'NAP-Q-ARE', name: 'Queen arena', fabric: 'Microfibra', sale_price: 2899000, estimated_cost: 1600000, quantity_on_hand: 0, quantity_reserved: 0, location: 'Bodega B', status: 'ACTIVE', created_at: now, updated_at: now }
    ], { transaction });
  });
};

export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.bulkDelete('product_variants', { id: [1, 2, 3, 4] }, { transaction });
    await context.bulkDelete('products', { id: [1, 2, 3] }, { transaction });
    await context.bulkDelete('categories', { id: [1, 2, 3] }, { transaction });
  });
};
