import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

const reference = (model: string) => ({
  type: DataTypes.BIGINT.UNSIGNED,
  allowNull: false,
  references: { model, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT'
});

export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.createTable('workshop_jobs', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      order_item_id: { ...reference('order_items'), unique: true },
      workshop_user_id: reference('users'),
      status: { type: DataTypes.ENUM('ASSIGNED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'COMPLETED', 'CANCELLED'), allowNull: false, defaultValue: 'ASSIGNED' },
      instructions: DataTypes.TEXT,
      expected_completion_date: DataTypes.DATEONLY,
      assigned_by_user_id: reference('users'),
      assigned_at: { type: DataTypes.DATE, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { transaction });
    await context.addIndex('workshop_jobs', ['workshop_user_id'], { transaction });
    await context.addIndex('workshop_jobs', ['status'], { transaction });
    await context.addIndex('workshop_jobs', ['expected_completion_date'], { transaction });
  });
};

export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('workshop_jobs', { transaction });
  });
};
