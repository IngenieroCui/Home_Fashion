import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Transaction } from 'sequelize';
import { ProductImage } from './entities/product-image.model';

@Injectable()
export class CatalogImageResolverService {
  constructor(@InjectModel(ProductImage) private readonly images: typeof ProductImage) {}
  async resolvePrimaryImageUrl(productId: string, productVariantId?: string | null, transaction?: Transaction): Promise<string | null> {
    // Hold the selected image until the commercial snapshot commits.
    const read = { transaction, lock: transaction?.LOCK.SHARE };
    if (productVariantId) {
      const variant = await this.images.findOne({ where: { productId, productVariantId }, order: [['isPrimary', 'DESC'], ['position', 'ASC'], ['id', 'ASC']], ...read });
      if (variant) return variant.url;
    }
    const product = await this.images.findOne({ where: { productId, productVariantId: null }, order: [['isPrimary', 'DESC'], ['position', 'ASC'], ['id', 'ASC']], ...read });
    return product?.url ?? null;
  }
}
