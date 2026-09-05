import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

const foreignKey = (model: string, allowNull = false) => ({
  type: DataTypes.BIGINT.UNSIGNED,
  allowNull,
  references: { model, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT'
});

export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.createTable('deliveries', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      order_id: { ...foreignKey('orders'), unique: true },
      status: { type: DataTypes.ENUM('SCHEDULED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'), allowNull: false, defaultValue: 'SCHEDULED' },
      address: { type: DataTypes.STRING(500), allowNull: false },
      address_reference: DataTypes.STRING(255),
      contact_name: { type: DataTypes.STRING(160), allowNull: false },
      contact_phone: { type: DataTypes.STRING(40), allowNull: false },
      scheduled_date: { type: DataTypes.DATEONLY, allowNull: false },
      time_window: DataTypes.STRING(80),
      delivery_type: { type: DataTypes.ENUM('OWNER', 'EMPLOYEE', 'EXTERNAL_DRIVER'), allowNull: false },
      assigned_user_id: foreignKey('users', true),
      external_driver_name: DataTypes.STRING(160),
      fee: DataTypes.DECIMAL(12, 2),
      notes: DataTypes.TEXT,
      receiver_name: DataTypes.STRING(160),
      evidence_urls: DataTypes.JSON,
      delivered_at: DataTypes.DATE,
      created_by_user_id: foreignKey('users'),
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { transaction });
    await context.addIndex('deliveries', ['status', 'scheduled_date'], { transaction });
    await context.addIndex('deliveries', ['scheduled_date'], { transaction });
    await context.addIndex('deliveries', ['assigned_user_id'], { transaction });
    await context.addIndex('deliveries', ['created_by_user_id'], { transaction });
    await context.sequelize.query(
      "ALTER TABLE deliveries ADD CONSTRAINT chk_deliveries_assignment CHECK ((delivery_type = 'EXTERNAL_DRIVER' AND assigned_user_id IS NULL AND CHAR_LENGTH(TRIM(external_driver_name)) > 0) OR (delivery_type IN ('OWNER', 'EMPLOYEE') AND assigned_user_id IS NOT NULL AND external_driver_name IS NULL))",
      { transaction }
    );
    await context.sequelize.query('ALTER TABLE deliveries ADD CONSTRAINT chk_deliveries_fee CHECK (fee IS NULL OR fee >= 0)', { transaction });
  });
};

export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('deliveries', { transaction });
  });
};
