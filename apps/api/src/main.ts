import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { EvidenceLinksInterceptor } from './modules/media/evidence-links.interceptor';
import { Sequelize } from 'sequelize-typescript';
import { requestRateLimit } from './config/request-rate-limit';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  const logger = new Logger('Http');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const start = performance.now();
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () => {
      const event = JSON.stringify({
        event: 'http_request', requestId, method: req.method,
        route: req.route?.path ?? 'unmatched', status: res.statusCode,
        durationMs: Math.round(performance.now() - start)
      });
      if (res.statusCode >= 500) logger.error(event);
      else logger.log(event);
    });
    next();
  });
  app.useBodyParser('json', { limit: '100kb' });
  app.useGlobalInterceptors(app.get(EvidenceLinksInterceptor));
  app.use(requestRateLimit(app.get(Sequelize), configService));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  await app.listen(port);
}

void bootstrap();
