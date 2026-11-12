import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import { attemptStatuses, type AttemptStatus } from './payment-attempt.model';

export type WompiTransaction = {
  id: string;
  reference: string;
  amount_in_cents: number;
  currency: string;
  status: AttemptStatus;
  created_at: string;
  finalized_at?: string | null;
  payment_method_type?: string;
};
export type WompiEvent = {
  event: string;
  environment: string;
  timestamp: number;
  data: { transaction: WompiTransaction };
  signature: { properties: string[]; checksum: string };
};
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class WompiAdapter {
  constructor(private readonly config: ConfigService) {}
  settings() {
    if (this.config.get('WOMPI_ENABLED') !== 'true')
      throw new ServiceUnavailableException('Wompi Sandbox no está configurado.');
    const publicKey = this.config.get<string>('WOMPI_PUBLIC_KEY') ?? '';
    const privateKey = this.config.get<string>('WOMPI_PRIVATE_KEY') ?? '';
    const integrity = this.config.get<string>('WOMPI_INTEGRITY_SECRET') ?? '';
    const events = this.config.get<string>('WOMPI_EVENTS_SECRET') ?? '';
    const linkSecret = this.config.get<string>('WOMPI_LINK_SECRET') ?? '';
    const publicUrl = this.config.get<string>('WOMPI_PUBLIC_WEB_URL') ?? '';
    if (
      !publicKey.startsWith('pub_test_') ||
      !privateKey.startsWith('prv_test_') ||
      !integrity.startsWith('test_integrity_') ||
      !events.startsWith('test_events_') ||
      linkSecret.length < 32
    )
      throw new ServiceUnavailableException('Se requieren exclusivamente credenciales Sandbox.');
    // This phase is deliberately limited to an isolated local database, also behind an HTTPS tunnel if needed.
    if (
      !['127.0.0.1', 'localhost', '::1'].includes(this.config.get<string>('DB_HOST') ?? '') ||
      !/sandbox|e2e/.test(this.config.get<string>('DB_NAME') ?? '') ||
      this.config.get('WOMPI_SANDBOX_DATABASE_ISOLATED') !== 'true'
    )
      throw new ServiceUnavailableException('Wompi requiere MySQL local aislado.');
    let url: URL;
    try {
      url = new URL(publicUrl);
    } catch {
      throw new ServiceUnavailableException('Configura la URL pública HTTPS.');
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new ServiceUnavailableException('Configura un origen público HTTPS.');
    return { publicKey, privateKey, integrity, events, linkSecret, publicUrl: url.origin };
  }
  verifyEvent(value: unknown): WompiEvent {
    const { events } = this.settings();
    const event = value as WompiEvent;
    if (
      !event ||
      event.event !== 'transaction.updated' ||
      event.environment !== 'test' ||
      !Number.isSafeInteger(event.timestamp) ||
      event.timestamp <= 0 ||
      !Array.isArray(event.signature?.properties) ||
      !event.signature.properties.length ||
      event.signature.properties.length > 32 ||
      !/^[a-f0-9]{64}$/i.test(event.signature?.checksum ?? '')
    )
      throw new UnauthorizedException('Invalid Wompi event');
    let content = '';
    for (const path of event.signature.properties) {
      if (typeof path !== 'string' || path.length > 200 || !/^[a-zA-Z0-9_.]+$/.test(path))
        throw new UnauthorizedException('Invalid signature properties');
      let field: unknown = event.data;
      for (const part of path.split('.')) {
        if (
          ['__proto__', 'prototype', 'constructor'].includes(part) ||
          !field ||
          typeof field !== 'object' ||
          !Object.hasOwn(field, part)
        )
          throw new UnauthorizedException('Invalid signature properties');
        field = (field as Record<string, unknown>)[part];
      }
      if (typeof field !== 'string' && (typeof field !== 'number' || !Number.isSafeInteger(field)))
        throw new UnauthorizedException('Invalid signature value');
      content += String(field);
    }
    const expected = Buffer.from(sha256(content + event.timestamp + events), 'hex');
    if (!timingSafeEqual(expected, Buffer.from(event.signature.checksum, 'hex')))
      throw new UnauthorizedException('Invalid Wompi signature');
    this.validateTransaction(event.data?.transaction, false);
    return event;
  }
  validateTransaction(value: unknown, requireDates = true): asserts value is WompiTransaction {
    const tx = value as WompiTransaction;
    if (
      !tx ||
      typeof tx.id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,160}$/.test(tx.id) ||
      typeof tx.reference !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(tx.reference) ||
      !Number.isSafeInteger(tx.amount_in_cents) ||
      tx.amount_in_cents <= 0 ||
      tx.currency !== 'COP' ||
      !attemptStatuses.includes(tx.status) ||
      (requireDates && (!tx.created_at || !Number.isFinite(Date.parse(tx.created_at)))) ||
      (requireDates &&
        tx.status === 'APPROVED' &&
        (!tx.finalized_at || !Number.isFinite(Date.parse(tx.finalized_at))))
    )
      throw new BadRequestException('Invalid Wompi transaction');
  }
  async transaction(id: string): Promise<WompiTransaction> {
    const { privateKey } = this.settings();
    try {
      const response = await fetch(
        `https://sandbox.wompi.co/v1/transactions/${encodeURIComponent(id)}`,
        {
          headers: { Authorization: `Bearer ${privateKey}` },
          signal: AbortSignal.timeout(10000),
          redirect: 'error'
        }
      );
      if (!response.ok) throw new Error();
      const body = (await response.json()) as { data?: unknown };
      this.validateTransaction(body.data);
      return body.data;
    } catch {
      throw new ServiceUnavailableException('No fue posible verificar la transacción con Wompi.');
    }
  }
  checkout(reference: string, amountInCents: string, expiresAt: Date, token: string) {
    const { publicKey, integrity, publicUrl } = this.settings();
    const expiration = expiresAt.toISOString();
    const params = new URLSearchParams({
      'public-key': publicKey,
      currency: 'COP',
      'amount-in-cents': amountInCents,
      reference,
      'expiration-time': expiration,
      'redirect-url': `${publicUrl}/cobro/${token}`,
      'signature:integrity': sha256(reference + amountInCents + 'COP' + expiration + integrity)
    });
    return `https://checkout.wompi.co/p/?${params}`;
  }
}
