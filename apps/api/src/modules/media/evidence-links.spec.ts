import { CloudinaryMediaService } from './cloudinary-media.service';

describe('private evidence presentation', () => {
  const config: Record<string, string> = {
    CLOUDINARY_CLOUD_NAME: 'qa', CLOUDINARY_API_KEY: 'placeholder',
    CLOUDINARY_API_SECRET: 'fixture-value'
  };
  const cloud = new CloudinaryMediaService({ get: (key: string) => config[key] } as never);
  const reference = 'https://res.cloudinary.com/qa/image/authenticated/v123/home-fashion/payments/test.webp';

  it('accepts an authenticated upload response scoped to the requested job', async () => {
    const publicId = 'home-fashion/workshop-progress/QA-1/asset';
    const response = (id: string) => Response.json({
      public_id: id, secure_url: `https://res.cloudinary.com/qa/image/authenticated/v123/${id}.webp`
    });
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response(publicId))
      .mockResolvedValueOnce(response(publicId.replace('QA-1', 'QA-2')));
    const file = { buffer: Buffer.from('89504e470d0a1a0a00000000', 'hex'), mimetype: 'image/png', originalname: 'QA.png' };
    try {
      await expect(cloud.uploadImage(file, 'workshop-progress', 'QA-1')).resolves.toMatchObject({ publicId });
      const body = fetch.mock.calls[0][1]?.body as FormData;
      expect(body.get('folder')).toBe('home-fashion/workshop-progress/QA-1');
      expect(body.get('type')).toBe('authenticated');
      expect(body.get('overwrite')).toBe('false');
      await expect(cloud.uploadImage(file, 'workshop-progress', 'QA-1')).rejects.toThrow('este recurso');
    } finally { fetch.mockRestore(); }
  });

  it('signs authorized references with a five-minute expiry and refuses public or external URLs', () => {
    const link = new URL(cloud.evidenceLink(reference, 1000)!);
    expect(link.origin).toBe('https://api.cloudinary.com');
    expect(link.searchParams.get('expires_at')).toBe('1300');
    expect(link.searchParams.get('type')).toBe('authenticated');
    expect(link.searchParams.get('public_id')).toBe('home-fashion/payments/test');
    expect(link.searchParams.get('signature')).toHaveLength(64);
    expect(cloud.evidenceLink(reference.replace('/authenticated/', '/upload/'))).toBeNull();
    expect(cloud.evidenceLink(reference.replace('/qa/', '/other/'))).toBeNull();
  });
});
