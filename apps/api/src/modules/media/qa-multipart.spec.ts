import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { WorkshopOwnJobsController } from '../workshop-jobs/workshop-progress.controller';
import { WorkshopProgressService } from '../workshop-jobs/workshop-progress.service';
import { DeliveriesController } from '../deliveries/deliveries.controller';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { SalesController } from '../sales/sales.controller';
import { SalesService } from '../sales/sales.service';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { MediaCleanupService } from './media-cleanup.service';
import { CloudinaryMediaService } from './cloudinary-media.service';

describe('QA real HTTP multipart limits with controlled domain/media', () => {
  let app: INestApplication;
  const png = Buffer.from('89504e470d0a1a0a00000000', 'hex');
  const media = { uploadImage: jest.fn().mockResolvedValue({ secureUrl: 'https://example.com/qa.png', publicId: 'QA-asset' }), scheduleRollback: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [WorkshopOwnJobsController, DeliveriesController, SalesController],
      providers: [
        { provide: WorkshopProgressService, useValue: { validateMediaSubmission: async () => 'QA', submit: async () => ({ ok: true }) } },
        { provide: DeliveriesService, useValue: { detail: async () => ({ code: 'QA' }), complete: async () => ({ ok: true }) } },
        { provide: SalesService, useValue: { preparePaymentMedia: async () => ({ code: 'QA' }), registerPayment: async (_saleId: string, dto: { evidenceUrl?: string }) => ({ payment: { id: 'QA', evidenceUrl: dto.evidenceUrl } }) } },
        { provide: CloudinaryMediaService, useValue: media },
        { provide: MediaCleanupService, useValue: media }
      ]
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { user?: object } } }) => { context.switchToHttp().getRequest().user = { id: 'QA' }; return true; } })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => { await app.close(); });
  beforeEach(() => jest.clearAllMocks());
  const endpoints = [
    { area: 'workshop', route: '/workshop/jobs/1/progress-media', field: 'files', fields: { type: 'PROGRESS', message: 'QA test', progressPercent: '50' }, min: 0, max: 5, success: 201 },
    { area: 'delivery', route: '/admin/deliveries/1/complete-media', field: 'files', fields: { receiverName: 'QA receiver' }, min: 1, max: 5, success: 200 },
    { area: 'payment', route: '/admin/sales/1/payments-media', field: 'file', fields: { intentId: 'c941116e-d1d7-4200-bdf2-e8b638c21a7a', type: 'PAYMENT', method: 'CASH', amount: '0.01', paidAt: '2026-09-29T12:00:00Z' }, min: 0, max: 1, success: 201 }
  ];
  function post(endpoint: typeof endpoints[number]) {
    let call = request(app.getHttpServer()).post(endpoint.route);
    for (const [key, value] of Object.entries(endpoint.fields)) call = call.field(key, value!);
    return call;
  }
  it.each(endpoints.flatMap(endpoint => [0, 1, 5, 6].map(count => ({ ...endpoint, count }))))('$area handles $count files through Multer and the real ValidationPipe', async (endpoint) => {
    let call = post(endpoint);
    for (let n = 0; n < endpoint.count; n++) call = call.attach(endpoint.field, png, { filename: 'QA.png', contentType: 'image/png' });
    const allowed = endpoint.count >= endpoint.min && endpoint.count <= endpoint.max;
    const response = await call;
    expect(response.status).toBe(allowed ? endpoint.success : 400);
    expect(media.uploadImage).toHaveBeenCalledTimes(allowed ? endpoint.count : 0);
  });
  it.each(endpoints)('$area rejects invalid MIME before remote upload', async endpoint => {
    const response = await post(endpoint).attach(endpoint.field, Buffer.from('QA text'), { filename: 'QA.png', contentType: 'text/plain' });
    expect(response.status).toBe(400); expect(media.uploadImage).not.toHaveBeenCalled();
  });
  it.each(endpoints)('$area rejects a file over 10 MB in Multer before remote upload', async endpoint => {
    const response = await post(endpoint).attach(endpoint.field, Buffer.alloc(10 * 1024 * 1024 + 1), { filename: 'QA.png', contentType: 'image/png' });
    expect(response.status).toBe(413); expect(media.uploadImage).not.toHaveBeenCalled();
  });
});
