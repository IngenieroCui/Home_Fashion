import { createHmac } from 'node:crypto';
import { requestRateLimit, clientAddress } from './request-rate-limit';

describe('persistent public request quotas', () => {
  it('trusts signed, recent, route-specific proxy claims and ignores spoofed forwarding on direct connections', () => {
    const path = '/api/auth/login';
    const timestamp = '1794480000';
    const secret = 'test-shared-secret-for-proxy-claims';
    const ip = '192.0.2.20';
    const signature = createHmac('sha256', secret).update([path, ip, timestamp].join('\n')).digest('hex');
    const request = {
      headers: {
        'x-forwarded-for': ip, 'x-vercel-forwarded-for': '192.0.2.21',
        'x-hf-client-ip': ip, 'x-hf-client-time': timestamp, 'x-hf-client-signature': signature
      },
      socket: { remoteAddress: '127.0.0.1' }
    };
    expect(clientAddress(request, path, secret, +timestamp, false)).toBe(ip);
    expect(clientAddress(request, '/api/auth/refresh', secret, +timestamp, false)).toBe('127.0.0.1');
    expect(clientAddress(request, path, secret, +timestamp + 31, false)).toBe('127.0.0.1');
    expect(clientAddress(request, path, undefined, +timestamp, true)).toBeNull();
    expect(clientAddress({ ...request, headers: { 'x-vercel-forwarded-for': '192.0.2.21' } }, path, undefined, +timestamp, true)).toBe('192.0.2.21');
    expect(clientAddress({ ...request, headers: {} }, path, undefined, +timestamp, true)).toBeNull();
  });

  it('uses the same counter across instances, sends 429 and allows requests in the next minute', async () => {
    const time = jest.spyOn(Date, 'now').mockReturnValue(1_794_480_000_000);
    const counters = new Map<string, number>();
    const database = {
      transaction: (work: (transaction: object) => unknown) => work({}),
      query: jest.fn(async (sql: string, options: { replacements: Array<string | number> }) => {
        const key = options.replacements.join(':');
        if (sql.startsWith('INSERT')) counters.set(key, (counters.get(key) ?? 0) + 1);
        return [{ hits: counters.get(key) }];
      })
    };
    const config = { getOrThrow: () => 'test-keys', get: () => undefined };
    const first = requestRateLimit(database as never, config as never);
    const second = requestRateLimit(database as never, config as never);
    const request = { method: 'POST', path: '/api/auth/login', headers: {}, body: { email: 'demo@example.invalid' }, socket: { remoteAddress: '127.0.0.1' } };
    const response = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    const next = jest.fn();
    try {
      for (let i = 0; i < 8; i++) await first(request as never, response as never, next);
      await second(request as never, response as never, next);
      expect(next).toHaveBeenCalledTimes(8);
      expect(response.status).toHaveBeenLastCalledWith(429);
      expect(response.setHeader).toHaveBeenLastCalledWith('Retry-After', '60');
      time.mockReturnValue(1_794_480_060_000);
      await second(request as never, response as never, next);
      expect(next).toHaveBeenCalledTimes(9);
    } finally { time.mockRestore(); }
  });
});
