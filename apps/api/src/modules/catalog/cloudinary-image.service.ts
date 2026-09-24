import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CloudinaryUpload = { secure_url: string; public_id: string };

@Injectable()
export class CloudinaryImageService {
  private readonly logger = new Logger(CloudinaryImageService.name);

  constructor(private readonly config: ConfigService) {}

  private credentials() {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException('Cloudinary no está configurado en .env');
    }
    return { cloudName, apiKey, apiSecret };
  }

  private async request(action: 'upload' | 'destroy', form: FormData): Promise<unknown> {
    const { cloudName, apiKey, apiSecret } = this.credentials();
    const authorization = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/${action}`, {
        method: 'POST',
        headers: { authorization: `Basic ${authorization}` },
        body: form,
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) {
        this.logger.error(`Cloudinary ${action} failed with HTTP ${response.status}`);
        throw new BadGatewayException('No fue posible guardar la imagen en Cloudinary');
      }
      return response.json();
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.error(`Cloudinary ${action} request failed`);
      throw new BadGatewayException('No fue posible conectar con Cloudinary');
    }
  }

  async upload(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<CloudinaryUpload> {
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
    form.set('folder', this.config.get<string>('CLOUDINARY_FOLDER') || 'home-fashion/products');
    const result = await this.request('upload', form) as Partial<CloudinaryUpload>;
    if (!result.secure_url || !result.public_id) throw new BadGatewayException('Cloudinary devolvió una respuesta incompleta');
    return { secure_url: result.secure_url, public_id: result.public_id };
  }

  async destroy(publicId: string): Promise<void> {
    const form = new FormData();
    form.set('public_id', publicId);
    form.set('invalidate', 'true');
    await this.request('destroy', form);
  }
}
