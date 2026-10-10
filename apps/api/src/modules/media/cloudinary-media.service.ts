import { BadRequestException, BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
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
        body: form, signal: AbortSignal.timeout(60000)
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        const message = failure?.error?.message?.slice(0, 300) ?? 'No diagnostic available';
        throw new Error(`HTTP ${response.status}: ${message}`);
      }
      return await response.json() as Record<string, unknown>;
    } catch (error) {
      this.logger.error(`Cloudinary ${action} failed: ${String(error)}`);
      throw new BadGatewayException('No fue posible procesar la imagen en Cloudinary');
    }
  }

  private async uploadSource(source: Blob | string, kind: MediaKind, code?: string, publicId?: string, overwrite = false): Promise<MediaUpload> {
    const form = new FormData();
    form.set('file', source);
    form.set('folder', this.folder(kind, code));
    if (publicId) { form.set('public_id', publicId); form.set('overwrite', String(overwrite)); }
    form.set('format', 'webp');
    form.set('transformation', `c_limit,w_${kind === 'products' ? 2000 : 1600},h_${kind === 'products' ? 2000 : 1600},q_auto:good`);
    const result = await this.request('upload', form);
    if (typeof result.secure_url !== 'string' || typeof result.public_id !== 'string') throw new BadGatewayException('Cloudinary devolvió una respuesta incompleta');
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
  async destroy(publicId: string) { const form = new FormData(); form.set('public_id', publicId); form.set('invalidate', 'true'); await this.request('destroy', form); }
  async destroyMany(publicIds: string[]) { await Promise.allSettled(publicIds.map((id) => this.destroy(id))); }
}
