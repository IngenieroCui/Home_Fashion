import type { Sequelize } from 'sequelize';
import { SequelizeStorage, Umzug, type UmzugOptions } from 'umzug';
import { createArtifactGlob, resolveDatabaseArtifactDirectory, type DatabaseArtifact } from './database.paths';
import type { DatabaseMigrationContext } from './migration.types';

export const MIGRATIONS_META_TABLE = 'SequelizeMeta';
export const SEEDERS_META_TABLE = 'SequelizeData';

function createLogger(label: string): UmzugOptions<DatabaseMigrationContext>['logger'] {
  return {
    debug: (message) => console.debug(`[${label}] ${message}`),
    info: (message) => console.info(`[${label}] ${message}`),
    warn: (message) => console.warn(`[${label}] ${message}`),
    error: (message) => console.error(`[${label}] ${message}`)
  };
}

function createUmzug(
  sequelize: Sequelize,
  artifact: DatabaseArtifact,
  tableName: string
): Umzug<DatabaseMigrationContext> {
  const directory = resolveDatabaseArtifactDirectory(artifact);

  return new Umzug<DatabaseMigrationContext>({
    migrations: {
      glob: createArtifactGlob(directory)
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize, tableName }),
    logger: createLogger(artifact)
  });
}

export function createMigrator(sequelize: Sequelize): Umzug<DatabaseMigrationContext> {
  return createUmzug(sequelize, 'migrations', MIGRATIONS_META_TABLE);
}

export function createSeeder(sequelize: Sequelize): Umzug<DatabaseMigrationContext> {
  return createUmzug(sequelize, 'seeders', SEEDERS_META_TABLE);
}
