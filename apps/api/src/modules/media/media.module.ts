import { Module } from '@nestjs/common';
import { CloudinaryMediaService } from './cloudinary-media.service';
import { AuthModule } from '../auth/auth.module';
import { MediaCleanupService } from './media-cleanup.service';
import { MediaCleanupController } from './media-cleanup.controller';
import { EvidenceLinksInterceptor } from './evidence-links.interceptor';

@Module({
  imports: [AuthModule],
  controllers: [MediaCleanupController],
  providers: [CloudinaryMediaService, MediaCleanupService, EvidenceLinksInterceptor],
  exports: [CloudinaryMediaService, MediaCleanupService, EvidenceLinksInterceptor]
})
export class MediaModule {}
