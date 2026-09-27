import { QueryTypes, type Sequelize } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

const tables = ['customers', 'quotes'] as const;
const columns = ['created_by_user_id', 'updated_by_user_id'] as const;

type ForeignKey = {
  constraintName: string;
  referencedTable: string;
  referencedColumn: string;
  updateRule: string;
  deleteRule: string;
};

async function foreignKeys(sequelize: Sequelize, table: string, column: string) {
  return sequelize.query<ForeignKey>(
    `SELECT k.CONSTRAINT_NAME AS constraintName,
            k.REFERENCED_TABLE_NAME AS referencedTable,
            k.REFERENCED_COLUMN_NAME AS referencedColumn,
            r.UPDATE_RULE AS updateRule,
            r.DELETE_RULE AS deleteRule
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
        AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
        AND r.TABLE_NAME = k.TABLE_NAME
      WHERE k.TABLE_SCHEMA = DATABASE()
        AND k.TABLE_NAME = :table
        AND k.COLUMN_NAME = :column
        AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: { table, column }, type: QueryTypes.SELECT }
  );
}

async function nullable(sequelize: Sequelize, table: string, column: string) {
  const rows = await sequelize.query<{ isNullable: string }>(
    `SELECT IS_NULLABLE AS isNullable
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    { replacements: { table, column }, type: QueryTypes.SELECT }
  );
  if (rows.length !== 1) throw new Error(`Missing ${table}.${column}`);
  return rows[0].isNullable === 'YES';
}

async function repairColumn(
  sequelize: Sequelize,
  table: (typeof tables)[number],
  column: (typeof columns)[number],
  allowNull: boolean
) {
  const keys = await foreignKeys(sequelize, table, column);
  if (
    keys.some(
      (key) =>
        key.referencedTable !== 'users' ||
        key.referencedColumn !== 'id' ||
        key.updateRule !== 'CASCADE' ||
        key.deleteRule !== 'RESTRICT' ||
        !/^[A-Za-z0-9_]+$/.test(key.constraintName)
    )
  ) {
    throw new Error(`Unexpected foreign key on ${table}.${column}`);
  }

  // MySQL DDL commits implicitly. Each step can be retried after an interruption.
  for (const key of keys) {
    await sequelize.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${key.constraintName}\``);
  }
  await sequelize.query(
    `ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` BIGINT UNSIGNED ${allowNull ? 'NULL' : 'NOT NULL'}`
  );
  await sequelize.query(
    `ALTER TABLE \`${table}\` ADD CONSTRAINT \`fk_hf_${table}_${column}\` ` +
      `FOREIGN KEY (\`${column}\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`
  );
  if ((await nullable(sequelize, table, column)) !== allowNull) {
    throw new Error(`Could not change nullability of ${table}.${column}`);
  }
  if ((await foreignKeys(sequelize, table, column)).length !== 1) {
    throw new Error(`Expected one foreign key on ${table}.${column}`);
  }
}

export const up: DatabaseMigration['up'] = async ({ context }) => {
  for (const table of tables) {
    for (const column of columns) {
      await repairColumn(context.sequelize, table, column, true);
    }
  }
};

export const down: DatabaseMigration['down'] = async ({ context }) => {
  const rows = await context.sequelize.query<{ publicRows: number | string }>(
    `SELECT
       (SELECT COUNT(*) FROM customers WHERE created_by_user_id IS NULL OR updated_by_user_id IS NULL) +
       (SELECT COUNT(*) FROM quotes WHERE created_by_user_id IS NULL OR updated_by_user_id IS NULL)
       AS publicRows`,
    { type: QueryTypes.SELECT }
  );
  if (Number(rows[0]?.publicRows ?? 0) > 0) {
    throw new Error('Cannot restore required audit users while public quote requests exist');
  }
  for (const table of tables) {
    for (const column of columns) {
      await repairColumn(context.sequelize, table, column, false);
    }
  }
};
