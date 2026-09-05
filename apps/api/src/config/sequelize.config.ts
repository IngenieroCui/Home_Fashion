import type { Options } from 'sequelize';
import type { ValidatedEnvironment } from './environment.validation';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  logging: boolean;
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
    logging: environment.DB_LOGGING
  };
}

export function createSequelizeOptions(config: DatabaseConfig): Options {
  return {
    dialect: 'mysql',
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    logging: config.logging ? (message: string) => console.log(message) : false
  };
}
