import type { QueryInterface, Transaction } from 'sequelize';

export type DatabaseMigrationContext = QueryInterface;
export type DatabaseTransaction = Transaction;

export interface DatabaseMigrationParams {
  context: DatabaseMigrationContext;
}

export type DatabaseMigrationHandler = (
  params: DatabaseMigrationParams
) => Promise<void>;

export interface DatabaseMigration {
  up: DatabaseMigrationHandler;
  down: DatabaseMigrationHandler;
}
