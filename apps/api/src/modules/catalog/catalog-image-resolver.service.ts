import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Transaction } from 'sequelize';
import { ProductImage } from './entities/product-image.model';

@Injectable()
export class CatalogImageResolverService {
  constructor(@InjectModel(ProductImage) private readonly images: typeof ProductImage) {}
  async resolvePrimaryImageUrl(productId: string, productVariantId?: string | null, transaction?: Transaction): Promise<string | null> {
    if (productVariantId) {
      const variant = await this.images.findOne({ where: { productId, productVariantId }, order: [['isPrimary', 'DESC'], ['position', 'ASC'], ['id', 'ASC']], transaction });
      if (variant) return variant.url;
    }
    const product = await this.images.findOne({ where: { productId, productVariantId: null }, order: [['isPrimary', 'DESC'], ['position', 'ASC'], ['id', 'ASC']], transaction });
    return product?.url ?? null;
  }
}
