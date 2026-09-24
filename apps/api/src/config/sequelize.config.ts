import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import * as mysql2 from 'mysql2';
import type { Options } from 'sequelize';
import type { ValidatedEnvironment } from './environment.validation';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  logging: boolean;
  sslMode: 'REQUIRED' | 'DISABLED';
  sslCaPath: string;
  sslCaBase64?: string;
}

export function createDatabaseConfig(
  environment: ValidatedEnvironment
): DatabaseConfig {
  return {
    host: environment.DB_HOST,
    port: environment.DB_PORT,
    database: environment.DB_NAME,
    username: environment.DB_USER,
    password: environment.DB_PASSWORD,
    logging: environment.DB_LOGGING,
    sslMode: environment.DB_SSL_MODE,
    sslCaPath: environment.DB_SSL_CA_PATH,
    sslCaBase64: environment.DB_SSL_CA_BASE64
  };
}

export function createSequelizeOptions(config: DatabaseConfig): Options {
  let ssl: { ca: string; rejectUnauthorized: true } | undefined;
  if (config.sslMode === 'REQUIRED') {
    try {
      const caPath = isAbsolute(config.sslCaPath)
        ? config.sslCaPath
        : resolve(__dirname, '../../../../', config.sslCaPath);
      const ca = config.sslCaBase64
        ? Buffer.from(config.sslCaBase64, 'base64').toString('utf8')
        : readFileSync(caPath, 'utf8');
      if (!ca.includes('-----BEGIN CERTIFICATE-----')) throw new Error('Invalid CA certificate');
      ssl = { ca, rejectUnauthorized: true };
    } catch {
      throw new Error('No se pudo cargar el certificado CA de MySQL. Revisa DB_SSL_CA_PATH o DB_SSL_CA_BASE64.');
    }
  }
  return {
    dialect: 'mysql',
    dialectModule: mysql2,
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    ...(ssl ? { dialectOptions: { ssl } } : {}),
    logging: config.logging ? (message: string) => console.log(message) : false
  };
}
