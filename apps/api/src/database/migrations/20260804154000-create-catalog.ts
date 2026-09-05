import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.createTable('categories', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING(120), allowNull: false }, slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
      description: DataTypes.TEXT, is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: DataTypes.DATE, allowNull: false }, updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { transaction });
    await context.createTable('products', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      name: { type: DataTypes.STRING(180), allowNull: false }, slug: { type: DataTypes.STRING(200), allowNull: false, unique: true }, description: { type: DataTypes.TEXT, allowNull: false },
      allows_customization: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
      created_at: { type: DataTypes.DATE, allowNull: false }, updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { transaction });
    await context.createTable('product_variants', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      sku: { type: DataTypes.STRING(100), allowNull: false, unique: true }, name: DataTypes.STRING(180), dimensions: DataTypes.STRING(160), material: DataTypes.STRING(160), color: DataTypes.STRING(100), fabric: DataTypes.STRING(120), finish: DataTypes.STRING(120),
      sale_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false }, estimated_cost: DataTypes.DECIMAL(12, 2),
      quantity_on_hand: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, quantity_reserved: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, location: DataTypes.STRING(180),
      status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' }, created_at: { type: DataTypes.DATE, allowNull: false }, updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { transaction });
    await context.createTable('product_images', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      product_variant_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, references: { model: 'product_variants', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      url: { type: DataTypes.STRING(2048), allowNull: false }, public_id: DataTypes.STRING(255), alt_text: DataTypes.STRING(255), position: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DataTypes.DATE, allowNull: false }, updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { transaction });
    await context.addIndex('products', ['category_id', 'status'], { transaction });
    await context.addIndex('product_variants', ['product_id', 'status'], { transaction });
    await context.addIndex('product_variants', ['status', 'quantity_on_hand', 'quantity_reserved'], { transaction });
    await context.addIndex('product_images', ['product_id', 'position'], { transaction });
    await context.addIndex('product_images', ['product_variant_id', 'position'], { transaction });
    await context.sequelize.query('ALTER TABLE product_variants ADD CONSTRAINT chk_product_variants_sale_price CHECK (sale_price > 0), ADD CONSTRAINT chk_product_variants_reserved_quantity CHECK (quantity_reserved <= quantity_on_hand)', { transaction });
  });
};

export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('product_images', { transaction });
    await context.dropTable('product_variants', { transaction });
    await context.dropTable('products', { transaction });
    await context.dropTable('categories', { transaction });
  });
};
