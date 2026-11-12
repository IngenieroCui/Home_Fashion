import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

// Additive only: no UPDATE, DELETE, historical backfill or automatic synchronization.
// MySQL DDL commits implicitly. Each step tolerates a restart after partial execution.
export const up: DatabaseMigration['up'] = async ({ context }) => {
  const columns = await context.describeTable('sale_payments');
  if (!columns.intent_id)
    await context.addColumn('sale_payments', 'intent_id', {
      type: DataTypes.STRING(36),
      allowNull: true
    });
  if (!columns.intent_fingerprint)
    await context.addColumn('sale_payments', 'intent_fingerprint', {
      type: DataTypes.STRING(64),
      allowNull: true
    });
  const indexes = (await context.showIndex('sale_payments')) as Array<{ name: string }>;
  if (!indexes.some((index) => index.name === 'uq_sale_payment_intent'))
    await context.addIndex('sale_payments', ['intent_id'], {
      unique: true,
      name: 'uq_sale_payment_intent'
    });
};
export const down: DatabaseMigration['down'] = async () => {
  throw new Error('Forward-only financial migration: preserve payment intent history.');
};
