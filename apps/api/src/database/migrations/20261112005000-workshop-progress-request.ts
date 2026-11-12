import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

const table = 'workshop_progress_reports';
const index = 'workshop_progress_request_unique';

export const up: DatabaseMigration['up'] = async ({ context }) => {
  const columns = await context.describeTable(table);
  if (!columns.request_id) {
    await context.addColumn(table, 'request_id', { type: DataTypes.CHAR(32), allowNull: true });
  }
  if (!columns.request_fingerprint) {
    await context.addColumn(table, 'request_fingerprint', { type: DataTypes.CHAR(64), allowNull: true });
  }
  const indexes = await context.showIndex(table) as unknown as { name: string }[];
  if (!indexes.some(entry => entry.name === index)) {
    await context.addIndex(table, ['workshop_job_id', 'submitted_by_user_id', 'request_id'], { name: index, unique: true });
  }
};

export const down: DatabaseMigration['down'] = async ({ context }) => {
  const indexes = await context.showIndex(table) as unknown as { name: string }[];
  if (indexes.some(entry => entry.name === index)) await context.removeIndex(table, index);
  const columns = await context.describeTable(table);
  if (columns.request_fingerprint) await context.removeColumn(table, 'request_fingerprint');
  if (columns.request_id) await context.removeColumn(table, 'request_id');
};
