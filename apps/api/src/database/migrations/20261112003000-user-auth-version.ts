import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.addColumn('users', 'auth_version', {
    type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0
  });
};
export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.removeColumn('users', 'auth_version');
};
