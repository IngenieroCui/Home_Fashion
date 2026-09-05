import { DataTypes, QueryTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

const publicAudit = (allowNull: boolean) => ({
  type: DataTypes.BIGINT.UNSIGNED,
  allowNull,
  references: { model: 'users', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT'
});

export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.changeColumn('customers', 'created_by_user_id', publicAudit(true), {
      transaction
    });
    await context.changeColumn('customers', 'updated_by_user_id', publicAudit(true), {
      transaction
    });
    await context.changeColumn('quotes', 'created_by_user_id', publicAudit(true), { transaction });
    await context.changeColumn('quotes', 'updated_by_user_id', publicAudit(true), { transaction });
    await context.addColumn(
      'quotes',
      'public_request_key',
      { type: DataTypes.STRING(36), allowNull: true },
      { transaction }
    );
    await context.addColumn(
      'quotes',
      'public_request_payload_hash',
      { type: DataTypes.STRING(64), allowNull: true },
      { transaction }
    );
    await context.addIndex('quotes', ['public_request_key'], {
      unique: true,
      name: 'uq_quotes_public_request_key',
      transaction
    });
  });
};

export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    const auditRows = await context.sequelize.query<{ public_audit_rows: number | string }>(
      `SELECT
        (SELECT COUNT(*) FROM customers WHERE created_by_user_id IS NULL OR updated_by_user_id IS NULL) +
        (SELECT COUNT(*) FROM quotes WHERE created_by_user_id IS NULL OR updated_by_user_id IS NULL)
        AS public_audit_rows`,
      { type: QueryTypes.SELECT, transaction }
    );
    if (Number(auditRows[0]?.public_audit_rows ?? 0) > 0) {
      throw new Error('Cannot disable public quote requests while public audit rows exist');
    }
    await context.removeIndex('quotes', 'uq_quotes_public_request_key', { transaction });
    await context.removeColumn('quotes', 'public_request_payload_hash', { transaction });
    await context.removeColumn('quotes', 'public_request_key', { transaction });
    await context.changeColumn('customers', 'created_by_user_id', publicAudit(false), {
      transaction
    });
    await context.changeColumn('customers', 'updated_by_user_id', publicAudit(false), {
      transaction
    });
    await context.changeColumn('quotes', 'created_by_user_id', publicAudit(false), { transaction });
    await context.changeColumn('quotes', 'updated_by_user_id', publicAudit(false), { transaction });
  });
};
