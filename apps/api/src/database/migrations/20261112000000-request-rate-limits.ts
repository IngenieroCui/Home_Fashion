import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.createTable('request_rate_limits', {
    bucket_key: { type: DataTypes.CHAR(64), primaryKey: true, allowNull: false },
    window_start: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, allowNull: false },
    hits: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }
  });
  await context.addIndex('request_rate_limits', ['window_start']);
};
export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.dropTable('request_rate_limits');
};
