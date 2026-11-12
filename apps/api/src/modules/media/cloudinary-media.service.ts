import { BadRequestException, BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { hasMatchingImageSignature } from './validate-media-files';
import type { ImageFile, MediaKind, MediaUpload } from './media.types';

@Injectable()
export class CloudinaryMediaService {
  private readonly logger = new Logger(CloudinaryMediaService.name);
  constructor(private readonly config: ConfigService) {}

  folder(kind: MediaKind, code?: string) {
    const root = (this.config.get<string>('CLOUDINARY_ROOT_FOLDER') || 'home-fashion').replace(/\/+$/, '');
    const base = kind === 'products' ? (this.config.get<string>('CLOUDINARY_FOLDER') || `${root}/products`) : `${root}/${kind}`;
    return code ? `${base}/${code.replace(/[^a-zA-Z0-9_-]/g, '-')}` : base;
  }

  private async request(action: 'upload' | 'destroy', form: FormData): Promise<Record<string, unknown>> {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) throw new ServiceUnavailableException('Cloudinary no está configurado');
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/${action}`, {
        method: 'POST', headers: { authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}` },
        body: form, signal: AbortSignal.timeout(action === 'destroy' ? 5000 : 55000)
      });
      if (!response.ok) {
        throw new Error('Cloudinary returned an error');
      }
      return await response.json() as Record<string, unknown>;
    } catch {
      this.logger.error('Cloudinary request failed');
      throw new BadGatewayException('No fue posible procesar la imagen en Cloudinary');
    }
  }

  private async uploadSource(source: Blob | string, kind: MediaKind, code?: string, publicId?: string, overwrite = false): Promise<MediaUpload> {
    const form = new FormData();
    form.set('file', source);
    form.set('folder', this.folder(kind, code));
    if (publicId) { form.set('public_id', publicId); form.set('overwrite', String(overwrite)); }
    if (kind !== 'products') form.set('type', 'authenticated');
    form.set('format', 'webp');
    form.set('transformation', `c_limit,w_${kind === 'products' ? 2000 : 1600},h_${kind === 'products' ? 2000 : 1600},q_auto:good`);
    const result = await this.request('upload', form);
    if (typeof result.secure_url !== 'string' || typeof result.public_id !== 'string') throw new BadGatewayException('Cloudinary devolvió una respuesta incompleta');
    if (kind !== 'products' && !this.evidenceReference(result.secure_url))
      throw new BadGatewayException('Cloudinary no confirmó el modo privado de la imagen');
    return { secureUrl: result.secure_url, publicId: result.public_id, width: result.width as number | undefined, height: result.height as number | undefined, bytes: result.bytes as number | undefined, format: result.format as string | undefined };
  }

  uploadImage(file: ImageFile, kind: MediaKind, code?: string, publicId?: string, overwrite = false) {
    if (file.buffer.length > 10 * 1024 * 1024 || !hasMatchingImageSignature(file)) throw new BadRequestException('La imagen no coincide con el formato declarado o excede 10 MB');
    return this.uploadSource(new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), kind, code, publicId, overwrite);
  }
  uploadRemoteImage(url: string, kind: MediaKind, code?: string, publicId?: string, overwrite = false) {
    if (!/^https:\/\//i.test(url)) throw new BadGatewayException('La fuente de imagen debe usar HTTPS');
    return this.uploadSource(url, kind, code, publicId, overwrite);
  }

  private evidenceReference(value: string) {
    try {
      const url = new URL(value);
      const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
      const prefix = '/' + cloudName + '/image/authenticated/';
      if (url.origin !== 'https://res.cloudinary.com' || !url.pathname.startsWith(prefix) || url.search || url.hash) return null;
      const resource = decodeURIComponent(url.pathname.slice(prefix.length)).replace(/^v[0-9]+\//, '');
      const match = /^([A-Za-z0-9/_-]+)\.(webp|jpg|jpeg|png|gif)$/.exec(resource);
      if (!match || !(['workshop-progress', 'deliveries', 'payments'] as const).some(kind =>
        match[1].startsWith(this.folder(kind) + '/'))) return null;
      return { cloudName, publicId: match[1], format: match[2] };
    } catch {
      return null;
    }
  }

  assertExternalEvidence(values: readonly string[]) {
    if (values.some(value => this.evidenceReference(value))) {
      throw new BadRequestException('Usa la carga de archivos para adjuntar evidencias privadas');
    }
  }

  evidenceLink(value: unknown, now = Math.floor(Date.now() / 1000)) {
    if (typeof value !== 'string') return null;
    const reference = this.evidenceReference(value);
    const key = this.config.get<string>('CLOUDINARY_API_KEY');
    const secret = this.config.get<string>('CLOUDINARY_API_SECRET');
    if (!reference || !key || !secret) return null;
    const fields = {
      expires_at: String(now + 300), format: reference.format, public_id: reference.publicId,
      timestamp: String(now), type: 'authenticated'
    };
    const signature = createHash('sha256').update(
      Object.entries(fields).map(([name, data]) => name + '=' + data).join('&') + secret
    ).digest('hex');
    const query = new URLSearchParams({ ...fields, api_key: key, signature });
    return 'https://api.cloudinary.com/v1_1/' + encodeURIComponent(reference.cloudName!) + '/image/download?' + query;
  }

  async destroy(publicId: string, kind: MediaKind = 'products') {
    if (!publicId.startsWith(this.folder(kind) + '/') || !/^[A-Za-z0-9/_-]+$/.test(publicId)) {
      throw new BadRequestException('El recurso no pertenece a la carpeta administrada');
    }
    const form = new FormData();
    form.set('public_id', publicId);
    form.set('invalidate', 'true');
    if (kind !== 'products') form.set('type', 'authenticated');
    const response = await this.request('destroy', form);
    if (response.result !== 'ok' && response.result !== 'not found') {
      throw new BadGatewayException('Cloudinary no confirmó el borrado');
    }
  }
}
