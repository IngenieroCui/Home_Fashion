import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import type { Sequelize } from 'sequelize';
import { SequelizeStorage, Umzug, type UmzugOptions } from 'umzug';
import { createArtifactGlob, resolveDatabaseArtifactDirectory, type DatabaseArtifact } from './database.paths';
import type { DatabaseMigration } from './migration.types';

const loadMigration = createRequire(__filename);
export function resolveMigrationModule(value: DatabaseMigration | { default: DatabaseMigration }): DatabaseMigration {
  const migration = 'up' in value ? value : value.default;
  if (typeof migration?.up !== 'function' || typeof migration?.down !== 'function') {
    throw new Error('Database migration must export up and down functions');
  }
  return migration;
}
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

  const storage = new SequelizeStorage({ sequelize, tableName });
  return new Umzug<DatabaseMigrationContext>({
    migrations: {
      glob: createArtifactGlob(directory),
      // Umzug's native dynamic import can wrap tsx/CommonJS exports under default.
      // createRequire also preserves Windows absolute paths and tsx's registered loader.
      resolve: ({ name, path, context }) => ({
        name,
        path,
        up: async () => resolveMigrationModule(loadMigration(path!)).up({ context }),
        down: async () => resolveMigrationModule(loadMigration(path!)).down({ context })
      })
    },
    context: sequelize.getQueryInterface(),
    storage: {
      // Production records .js names; tsx loads the same artifacts as .ts.
      // Resolve both extensions without replaying migrations or rewriting history.
      async executed() {
        const names = await storage.executed();
        return [...new Set(names.map((name) => {
          const base = name.replace(/\.(js|ts)$/, '');
          return existsSync(join(directory, base + '.ts')) ? base + '.ts' : base + '.js';
        }))];
      },
      async logMigration({ name }) { await storage.logMigration({ name: name.replace(/\.ts$/, '.js') }); },
      async unlogMigration({ name }) { await storage.unlogMigration({ name: name.replace(/\.ts$/, '.js') }); }
    },
    logger: createLogger(artifact)
  });
}

export function createMigrator(sequelize: Sequelize): Umzug<DatabaseMigrationContext> {
  return createUmzug(sequelize, 'migrations', MIGRATIONS_META_TABLE);
}

export function createSeeder(sequelize: Sequelize): Umzug<DatabaseMigrationContext> {
  return createUmzug(sequelize, 'seeders', SEEDERS_META_TABLE);
}
