import { CloudinaryMediaService } from './cloudinary-media.service';

describe('private evidence presentation', () => {
  const config: Record<string, string> = {
    CLOUDINARY_CLOUD_NAME: 'qa', CLOUDINARY_API_KEY: 'placeholder',
    CLOUDINARY_API_SECRET: 'fixture-value'
  };
  const cloud = new CloudinaryMediaService({ get: (key: string) => config[key] } as never);
  const reference = 'https://res.cloudinary.com/qa/image/authenticated/v123/home-fashion/payments/test.webp';

  it('signs authorized references with a five-minute expiry and refuses public or external URLs', () => {
    const link = new URL(cloud.evidenceLink(reference, 1000)!);
    expect(link.origin).toBe('https://api.cloudinary.com');
    expect(link.searchParams.get('expires_at')).toBe('1300');
    expect(link.searchParams.get('type')).toBe('authenticated');
    expect(link.searchParams.get('public_id')).toBe('home-fashion/payments/test');
    expect(link.searchParams.get('signature')).toHaveLength(64);
    expect(cloud.evidenceLink(reference.replace('/authenticated/', '/upload/'))).toBeNull();
    expect(cloud.evidenceLink(reference.replace('/qa/', '/other/'))).toBeNull();
    expect(() => cloud.assertExternalEvidence([reference])).toThrow('Usa la carga');
  });
});
