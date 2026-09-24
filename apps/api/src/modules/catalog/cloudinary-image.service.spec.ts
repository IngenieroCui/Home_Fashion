import { BadGatewayException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { CloudinaryImageService } from './cloudinary-image.service';

describe('CloudinaryImageService', () => {
  const values: Record<string, string> = {
    CLOUDINARY_CLOUD_NAME: 'demo',
    CLOUDINARY_API_KEY: 'public-key',
    CLOUDINARY_API_SECRET: 'private-secret',
    CLOUDINARY_FOLDER: 'home-fashion/products'
  };
  const service = new CloudinaryImageService({ get: (key: string) => values[key] } as never);

  afterEach(() => jest.restoreAllMocks());

  it('uploads an image with server-side credentials and returns its Cloudinary identity', async () => {
    const request = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/photo.jpg', public_id: 'home-fashion/products/photo' })
    } as Response);
    await expect(service.upload({ buffer: Buffer.from('image'), mimetype: 'image/jpeg', originalname: 'photo.jpg' }))
      .resolves.toEqual({ secure_url: 'https://res.cloudinary.com/demo/image/upload/photo.jpg', public_id: 'home-fashion/products/photo' });
    const [url, init] = request.mock.calls[0];
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');
    expect((init?.headers as Record<string, string>).authorization).toBe(`Basic ${Buffer.from('public-key:private-secret').toString('base64')}`);
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it('requires credentials before connecting and reports remote failures', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const missing = new CloudinaryImageService({ get: () => undefined } as never);
    await expect(missing.upload({ buffer: Buffer.from('image'), mimetype: 'image/png', originalname: 'photo.png' }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 401 } as Response);
    await expect(service.destroy('home-fashion/products/photo')).rejects.toBeInstanceOf(BadGatewayException);
  });
});
