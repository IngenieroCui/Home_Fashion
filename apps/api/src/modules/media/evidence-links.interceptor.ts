import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';
import { CloudinaryMediaService } from './cloudinary-media.service';

@Injectable()
export class EvidenceLinksInterceptor implements NestInterceptor {
  constructor(private readonly cloud: CloudinaryMediaService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const response = context.switchToHttp().getResponse<{ setHeader(name: string, value: string): void }>();
    return next.handle().pipe(map((value: unknown) => {
      let evidence = false;
      const present = (node: unknown): unknown => {
        if (Array.isArray(node)) return node.map(present);
        if (!node || typeof node !== 'object' || Object.getPrototypeOf(node) !== Object.prototype) return node;
        return Object.fromEntries(Object.entries(node).map(([key, field]) => {
          if (key === 'evidenceUrl') {
            evidence = true;
            return [key, this.cloud.evidenceLink(field)];
          }
          if (key === 'evidenceUrls') {
            evidence = true;
            return [key, Array.isArray(field) ? field.map(link => this.cloud.evidenceLink(link)).filter(Boolean) : null];
          }
          return [key, present(field)];
        }));
      };
      const result = present(value);
      if (evidence) response.setHeader('Cache-Control', 'private, no-store');
      return result;
    }));
  }
}
