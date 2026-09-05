import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

const reference = (model: string, allowNull = false) => ({
  type: DataTypes.BIGINT.UNSIGNED,
  allowNull,
  references: { model, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT'
});

export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.createTable(
      'sale_payments',
      {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
        sale_id: reference('sales'),
        customer_id: reference('customers'),
        type: { type: DataTypes.ENUM('DEPOSIT', 'PAYMENT', 'FINAL_PAYMENT', 'REFUND', 'ADJUSTMENT'), allowNull: false },
        method: { type: DataTypes.ENUM('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'ADDI', 'SISTECREDITO', 'BANK_TRANSFER', 'OTHER'), allowNull: false },
        adjustment_effect: DataTypes.ENUM('ADD_TO_PAID', 'SUBTRACT_FROM_PAID'),
        amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        paid_at: { type: DataTypes.DATE, allowNull: false },
        reference: DataTypes.STRING(160),
        notes: DataTypes.TEXT,
        evidence_url: DataTypes.STRING(500),
        status: { type: DataTypes.ENUM('REGISTERED', 'VOIDED'), allowNull: false, defaultValue: 'REGISTERED' },
        created_by_user_id: reference('users'),
        voided_by_user_id: reference('users', true),
        voided_at: DataTypes.DATE,
        void_reason: DataTypes.TEXT,
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false }
      },
      { transaction }
    );
    await context.addIndex('sale_payments', ['sale_id'], { transaction });
    await context.addIndex('sale_payments', ['customer_id'], { transaction });
    await context.addIndex('sale_payments', ['status'], { transaction });
    await context.addIndex('sale_payments', ['paid_at'], { transaction });
    await context.sequelize.query(
      'ALTER TABLE sale_payments ADD CONSTRAINT chk_sale_payments_amount CHECK (amount > 0)',
      { transaction }
    );
  });
};

export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('sale_payments', { transaction });
  });
};
