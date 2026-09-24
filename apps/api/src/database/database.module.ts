import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SequelizeModule, type SequelizeModuleOptions } from '@nestjs/sequelize';
import { createDatabaseConfig, createSequelizeOptions } from '../config/sequelize.config';
import { validateEnvironment } from '../config/environment.validation';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): SequelizeModuleOptions => {
        const config = createDatabaseConfig(
          validateEnvironment({
            NODE_ENV: configService.getOrThrow<string>('NODE_ENV'),
            PORT: configService.getOrThrow<number>('PORT'),
            DB_HOST: configService.getOrThrow<string>('DB_HOST'),
            DB_PORT: configService.getOrThrow<number>('DB_PORT'),
            DB_NAME: configService.getOrThrow<string>('DB_NAME'),
            DB_USER: configService.getOrThrow<string>('DB_USER'),
            DB_PASSWORD: configService.getOrThrow<string>('DB_PASSWORD'),
            DB_LOGGING: configService.getOrThrow<boolean>('DB_LOGGING'),
            DB_SSL_MODE: configService.getOrThrow<string>('DB_SSL_MODE'),
            DB_SSL_CA_PATH: configService.getOrThrow<string>('DB_SSL_CA_PATH'),
            DB_SSL_CA_BASE64: configService.get<string>('DB_SSL_CA_BASE64'),
            JWT_ACCESS_SECRET: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
            JWT_ACCESS_EXPIRES_IN: configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
            JWT_REFRESH_SECRET: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
            JWT_REFRESH_EXPIRES_IN: configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN')
          })
        );

        return {
          ...createSequelizeOptions(config),
        autoLoadModels: true,
        synchronize: false,
        retryAttempts: 3,
        retryDelay: 1000
        };
      }
    })
  ]
})
export class DatabaseModule {}
