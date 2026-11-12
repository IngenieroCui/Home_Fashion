import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.createTable('media_cleanup', {
    kind: { type: DataTypes.STRING(24), primaryKey: true, allowNull: false },
    public_id: { type: DataTypes.STRING(255), primaryKey: true, allowNull: false },
    attempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    due_at: { type: DataTypes.DATE, allowNull: false },
    completed_at: { type: DataTypes.DATE, allowNull: true }
  });
  await context.addIndex('media_cleanup', ['completed_at', 'due_at']);
};
export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.dropTable('media_cleanup');
};
