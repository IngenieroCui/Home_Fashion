import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(getConnectionToken())
      .useValue({ close: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns API health', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({
        status: 'ok',
        service: 'home-fashion-api'
      });
  });

  it('requires authentication for an administrative catalog endpoint', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/catalog/categories')
      .expect(401);
  });
});
