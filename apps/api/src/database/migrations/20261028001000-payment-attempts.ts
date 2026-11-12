import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';
const fk = (model: string, allowNull = false) => ({
  type: DataTypes.BIGINT.UNSIGNED,
  allowNull,
  references: { model, key: 'id' },
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.createTable('payment_attempts', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    sale_id: fk('sales'),
    provider: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'WOMPI' },
    reference: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    amount_in_cents: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'COP' },
    environment: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'SANDBOX' },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'DECLINED', 'ERROR', 'VOIDED'),
      allowNull: false
    },
    provider_transaction_id: { type: DataTypes.STRING(160), unique: true, allowNull: true },
    sale_payment_id: { ...fk('sale_payments', true), unique: true },
    token_hash: { type: DataTypes.STRING(64), unique: true, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    created_by_user_id: fk('users'),
    verified_at: { type: DataTypes.DATE, allowNull: true },
    last_event_timestamp: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    review_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    review_reason: { type: DataTypes.STRING(80), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false }
  });
  await context.addIndex('payment_attempts', ['sale_id']);
  await context.sequelize.query(
    "ALTER TABLE payment_attempts ADD CONSTRAINT chk_attempt_sandbox CHECK (provider = 'WOMPI' AND environment = 'SANDBOX' AND currency = 'COP' AND amount_in_cents > 0 AND amount_in_cents <= 999999999999)"
  );
};
export const down: DatabaseMigration['down'] = async () => {
  throw new Error('Forward-only financial migration: preserve provider and payment history.');
};
