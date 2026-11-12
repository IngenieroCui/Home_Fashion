import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

export const up: DatabaseMigration['up'] = async ({ context }) => {
  const columns = await context.describeTable('media_cleanup');
  if (!columns.source_url) {
    await context.addColumn('media_cleanup', 'source_url', { type: DataTypes.STRING(2048), allowNull: true });
  }
};

export const down: DatabaseMigration['down'] = async ({ context }) => {
  const columns = await context.describeTable('media_cleanup');
  if (columns.source_url) await context.removeColumn('media_cleanup', 'source_url');
};
