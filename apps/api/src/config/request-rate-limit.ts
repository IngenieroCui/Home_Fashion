import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { QueryTypes } from 'sequelize';
import type { Sequelize } from 'sequelize-typescript';

const minute = 60;
const rules = new Map([
  ['/api/auth/login', { name: 'login', ip: 20, identity: 8 }],
  ['/api/auth/refresh', { name: 'refresh', ip: 90 }],
  ['/api/public/quote-requests', { name: 'quote', ip: 12 }]
]);

function address(value: unknown) {
  if (typeof value !== 'string') return null;
  const ip = value.toLowerCase().replace(/^::ffff:/, '');
  return isIP(ip) ? ip : null;
}

export function clientAddress(request: Pick<Request, 'headers' | 'socket'>, path: string, secret: string | undefined, now: number, vercel: boolean) {
  const ip = address(request.headers['x-hf-client-ip']);
  const timestamp = request.headers['x-hf-client-time'];
  const signature = request.headers['x-hf-client-signature'];
  if (secret && ip && typeof timestamp === 'string' && /^\d{10}$/.test(timestamp) &&
    Math.abs(now - Number(timestamp)) <= 30 && typeof signature === 'string' && /^[a-f0-9]{64}$/.test(signature)) {
    const expected = createHmac('sha256', secret).update([path, ip, timestamp].join('\n')).digest();
    if (timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return ip;
  }
  if (vercel) return address(request.headers['x-vercel-forwarded-for']) ?? 'unknown';
  return address(request.socket.remoteAddress) ?? 'unknown';
}

export function requestRateLimit(database: Sequelize, config: ConfigService) {
  const logger = new Logger('RequestRateLimit');
  const keySecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
  const proxySecret = config.get<string>('HF_PROXY_SECRET');
  const vercel = config.get<string>('VERCEL') === '1';

  return async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path.toLowerCase().replace(/\/+$/, '');
    const rule = req.method === 'POST' && rules.get(path);
    if (!rule) return next();
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - now % minute;
    const ip = clientAddress(req, path, proxySecret, now, vercel);
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
    const counters = [{ key: 'ip:' + ip, limit: rule.ip }];
    if (rule.identity && email) counters.push({ key: 'login:' + ip + ':' + email, limit: rule.identity });
    try {
      const blocked = await database.transaction(async (transaction) => {
        for (const { key, limit } of counters) {
          const digest = createHmac('sha256', keySecret).update(rule.name + ':' + key).digest('hex');
          const replacements = [digest, windowStart];
          await database.query(
            'INSERT INTO request_rate_limits (bucket_key, window_start, hits) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE hits = LEAST(hits + 1, 10000)',
            { transaction, replacements }
          );
          const [row] = await database.query<{ hits: number }>(
            'SELECT hits FROM request_rate_limits WHERE bucket_key = ? AND window_start = ?',
            { transaction, replacements, type: QueryTypes.SELECT }
          );
          if (row.hits > limit) return true;
        }
        return false;
      });
      if (Math.random() < 0.01) {
        await database.query('DELETE FROM request_rate_limits WHERE window_start < ? ORDER BY window_start LIMIT 5000', {
          replacements: [windowStart - 3600]
        }).catch(() => logger.warn('rate_limit_cleanup_failed'));
      }
      if (!blocked) return next();
      logger.warn(JSON.stringify({ event: 'rate_limit_exceeded', endpoint: rule.name }));
      res.setHeader('Retry-After', String(minute - now % minute));
      return res.status(429).json({ statusCode: 429, message: 'Demasiadas solicitudes. Intenta nuevamente en un momento.' });
    } catch {
      logger.error('rate_limit_store_unavailable');
      return res.status(503).json({ statusCode: 503, message: 'Servicio temporalmente no disponible' });
    }
  };
}
