import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

const reference = (model: string, allowNull = false) => ({ type: DataTypes.BIGINT.UNSIGNED, allowNull, references: { model, key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' });

export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.createTable('order_tracking_accesses', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      order_id: { ...reference('orders'), unique: true },
      token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      token_prefix: { type: DataTypes.STRING(16), allowNull: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      expires_at: DataTypes.DATE,
      created_by_user_id: reference('users'),
      rotated_at: DataTypes.DATE,
      revoked_by_user_id: reference('users', true),
      revoked_at: DataTypes.DATE,
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { transaction });
    await context.addIndex('order_tracking_accesses', ['active'], { transaction });
    await context.addIndex('order_tracking_accesses', ['expires_at'], { transaction });
  });
};

export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('order_tracking_accesses', { transaction });
  });
};
