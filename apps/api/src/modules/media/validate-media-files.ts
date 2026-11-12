import { BadRequestException } from '@nestjs/common';
import type { ImageFile } from './media.types';

/** Check bytes as well as the client-supplied MIME type before any remote upload. */
export function hasMatchingImageSignature(file: ImageFile): boolean {
  const data = file.buffer;
  if (file.mimetype === 'image/jpeg') return data.length >= 3 && data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (file.mimetype === 'image/png') return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === 'image/webp') return data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
  if (file.mimetype === 'image/gif') return ['GIF87a', 'GIF89a'].includes(data.toString('ascii', 0, 6));
  return false;
}

export function validateMediaFiles(files: ImageFile[] | undefined, min: number) {
  const selected = files ?? [];
  if (selected.length < min || selected.length > 5 || selected.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) || file.buffer.length > 10 * 1024 * 1024 || !hasMatchingImageSignature(file))) {
    throw new BadRequestException('Selecciona entre ' + min + ' y 5 fotografías JPG, PNG o WebP de hasta 10 MB');
  }
  return selected;
}
