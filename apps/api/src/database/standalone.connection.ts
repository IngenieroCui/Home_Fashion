import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnvironment } from 'dotenv';
import { Sequelize } from 'sequelize';
import { createDatabaseConfig, createSequelizeOptions, type DatabaseConfig } from '../config/sequelize.config';
import { validateEnvironment } from '../config/environment.validation';

function resolveEnvironmentFile(): string | undefined {
  const candidates = [
    resolve(process.cwd(), 'apps/api/.env'),
    resolve(process.cwd(), '.env')
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

function redactDatabasePassword(message: string, password: string): string {
  return message.replaceAll(password, '[redacted]');
}

export function formatDatabaseError(error: unknown, config?: DatabaseConfig): string {
  const message = error instanceof Error ? error.message : 'Unknown database error';
  const safeMessage = config
    ? redactDatabasePassword(message, config.password)
    : message;

  return `Database connection failed: ${safeMessage}`;
}

export async function createStandaloneConnection(): Promise<{
  sequelize: Sequelize;
  config: DatabaseConfig;
}> {
  const environmentFile = resolveEnvironmentFile();

  if (environmentFile) {
    loadEnvironment({ path: environmentFile, quiet: true });
  }

  const config = createDatabaseConfig(validateEnvironment(process.env));
  const sequelize = new Sequelize(createSequelizeOptions(config));

  try {
    await sequelize.authenticate();
    return { sequelize, config };
  } catch (error) {
    await sequelize.close();
    throw new Error(formatDatabaseError(error, config));
  }
}
