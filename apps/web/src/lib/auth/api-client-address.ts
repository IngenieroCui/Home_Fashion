import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

export function apiClientAddress(path: string, headers: Pick<Headers, 'get'>): Record<string, string> {
  const secret = process.env.HF_PROXY_SECRET;
  const ip = headers.get('x-vercel-forwarded-for')?.toLowerCase().replace(/^::ffff:/, '');
  if (process.env.VERCEL !== '1') return {};
  if (!secret || secret.length < 32 || !ip || !isIP(ip)) throw new Error('Client address unavailable');
  const time = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', secret).update(['/api' + path, ip, time].join('\n')).digest('hex');
  return { 'x-hf-client-ip': ip, 'x-hf-client-time': time, 'x-hf-client-signature': signature };
}
