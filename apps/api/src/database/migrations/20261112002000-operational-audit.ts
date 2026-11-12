import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

const foreign = (table: string) => ({
  type: DataTypes.BIGINT.UNSIGNED, allowNull: false, references: { model: table, key: 'id' }
});

export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.createTable('order_cancellations', {
    order_id: { ...foreign('orders'), primaryKey: true },
    actor_id: foreign('users'),
    reason: { type: DataTypes.STRING(300), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false }
  });
  await context.createTable('inventory_movements', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
    variant_id: foreign('product_variants'),
    actor_id: foreign('users'),
    kind: { type: DataTypes.STRING(20), allowNull: false },
    delta: { type: DataTypes.INTEGER, allowNull: false },
    previous_quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    next_quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reason: { type: DataTypes.STRING(300), allowNull: false },
    reference: { type: DataTypes.STRING(48), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false }
  });
  await context.addIndex('inventory_movements', ['variant_id', 'kind', 'reference'], { unique: true });
  await context.createTable('user_admin_events', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
    actor_id: foreign('users'),
    target_id: foreign('users'),
    action: { type: DataTypes.STRING(32), allowNull: false },
    role_code: { type: DataTypes.STRING(32), allowNull: false },
    active: { type: DataTypes.BOOLEAN, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false }
  });
};
export const down: DatabaseMigration['down'] = async ({ context }) => {
  for (const table of ['user_admin_events', 'inventory_movements', 'order_cancellations']) await context.dropTable(table);
};
