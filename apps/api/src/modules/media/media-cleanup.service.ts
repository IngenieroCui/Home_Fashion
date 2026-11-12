import { Injectable, Logger } from '@nestjs/common';
import { QueryTypes, type Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { CloudinaryMediaService } from './cloudinary-media.service';
import type { MediaKind } from './media.types';

@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);
  constructor(private readonly database: Sequelize, private readonly cloud: CloudinaryMediaService) {}

  async enqueue(kind: MediaKind, publicId: string, transaction?: Transaction) {
    await this.database.query(
      'INSERT INTO media_cleanup (kind, public_id, due_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE due_at = IF(completed_at IS NULL, due_at, NOW()), attempts = IF(completed_at IS NULL, attempts, 0), completed_at = NULL',
      { replacements: [kind, publicId], transaction }
    );
  }

  async scheduleRollback(kind: MediaKind, ids: string[]) {
    for (const publicId of ids) {
      try { await this.enqueue(kind, publicId); }
      catch {
        this.logger.error(JSON.stringify({ event: 'media_cleanup_enqueue_failed', kind, publicId }));
      }
    }
  }

  async drain() {
    const jobs = await this.database.query<{ kind: MediaKind; public_id: string; attempts: number }>(
      'SELECT kind, public_id, attempts FROM media_cleanup WHERE completed_at IS NULL AND attempts < 8 AND due_at <= NOW() ORDER BY due_at LIMIT 5',
      { type: QueryTypes.SELECT }
    );
    let completed = 0;
    for (const job of jobs) {
      const id = [job.kind, job.public_id];
      const [, claimed] = await this.database.query(
        'UPDATE media_cleanup SET due_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE kind = ? AND public_id = ? AND completed_at IS NULL AND due_at <= NOW()',
        { replacements: id, type: QueryTypes.UPDATE }
      );
      if (!claimed) continue;
      try {
        if (job.kind === 'products') {
          const referenced = await this.database.query(
            'SELECT id FROM product_images WHERE public_id = ? LIMIT 1',
            { replacements: [job.public_id], type: QueryTypes.SELECT }
          );
          if (!referenced.length) await this.cloud.destroy(job.public_id, job.kind);
        } else {
          await this.cloud.destroy(job.public_id, job.kind);
        }
        await this.database.query('UPDATE media_cleanup SET completed_at = NOW() WHERE kind = ? AND public_id = ?', { replacements: id });
        completed++;
      } catch {
        await this.database.query('UPDATE media_cleanup SET attempts = attempts + 1, due_at = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE kind = ? AND public_id = ?', {
          replacements: [2 ** (job.attempts + 1), ...id]
        });
        this.logger.warn(JSON.stringify({ event: 'media_cleanup_retry', kind: job.kind, attempt: job.attempts + 1 }));
      }
    }
    return { checked: jobs.length, completed };
  }
}
