import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { createHash } from 'node:crypto';
import type { Transaction } from 'sequelize';
import { CatalogImageResolverService } from '../catalog/catalog-image-resolver.service';
import { CatalogStatus } from '../catalog/catalog.types';
import { Product } from '../catalog/entities/product.model';
import { ProductVariant } from '../catalog/entities/product-variant.model';
import { Customer } from '../quotes/entities/customer.model';
import { QuoteItem } from '../quotes/entities/quote-item.model';
import { Quote } from '../quotes/entities/quote.model';
import { QuoteStatus } from '../quotes/quotes.types';
import {
  CreatePublicQuoteRequestDto,
  PublicCustomizationDto
} from './dto/public-quote-request.dto';

const cents = (value: string) => {
  const [whole, decimal = ''] = value.trim().split('.');
  return BigInt(whole) * 100n + BigInt((decimal + '00').slice(0, 2));
};
const money = (value: bigint) => `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;

@Injectable()
export class PublicQuoteRequestsService {
  constructor(
    @InjectModel(Customer) private readonly customers: typeof Customer,
    @InjectModel(Quote) private readonly quotes: typeof Quote,
    @InjectModel(QuoteItem) private readonly items: typeof QuoteItem,
    @InjectModel(Product) private readonly products: typeof Product,
    @InjectModel(ProductVariant) private readonly variants: typeof ProductVariant,
    private readonly images: CatalogImageResolverService
  ) {}

  async create(dto: CreatePublicQuoteRequestDto, attempt = 0): Promise<{ received: true; requestCode: string; status: QuoteStatus }> {
    const payloadHash = this.payloadHash(dto);
    try {
      return await this.quotes.sequelize!.transaction(async (transaction) => {
        const repeated = await this.quotes.findOne({
          where: { publicRequestKey: dto.requestId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (repeated) return this.replay(repeated, payloadHash);

        const product = await this.products.findOne({
          where: { id: dto.productId, status: CatalogStatus.ACTIVE },
          transaction,
          lock: transaction.LOCK.SHARE
        });
        if (!product) throw new NotFoundException('Product not found');
        if (dto.customization && !product.allowsCustomization)
          throw new BadRequestException('Product does not allow customization');

        let variant: ProductVariant | null = null;
        if (dto.productVariantId) {
          variant = await this.variants.findOne({
            where: { id: dto.productVariantId, status: CatalogStatus.ACTIVE },
            transaction,
            lock: transaction.LOCK.SHARE
          });
          if (!variant) throw new NotFoundException('Product variant not found');
          if (variant.productId !== product.id)
            throw new BadRequestException('Product variant does not belong to product');
        } else if (!product.allowsCustomization) {
          throw new BadRequestException('Product variant is required');
        }

        const customer = await this.createCustomer(dto, transaction);
        const total = variant ? money(cents(variant.salePrice) * BigInt(dto.quantity)) : null;
        if (total !== null && cents(total) > 999_999_999_999n) throw new BadRequestException('Request total exceeds the monetary limit');
        const quote = await this.quotes.create(
          {
            code: 'PENDING',
            publicRequestKey: dto.requestId,
            publicRequestPayloadHash: payloadHash,
            customerId: customer.id,
            status: QuoteStatus.REQUESTED,
            validUntil: null,
            customerNotes: dto.message || null,
            internalNotes: null,
            deliveryFee: '0.00',
            subtotal: total,
            discountTotal: total === null ? null : '0.00',
            total,
            createdByUserId: null,
            updatedByUserId: null
          },
          { transaction }
        );
        await quote.update(
          { code: `HF-SOL-${new Date().getFullYear()}-${String(quote.id).padStart(5, '0')}` },
          { transaction }
        );

        await this.items.create(
          {
            quoteId: quote.id,
            productId: product.id,
            productVariantId: variant?.id ?? null,
            productNameSnapshot: product.name,
            imageUrlSnapshot: await this.images.resolvePrimaryImageUrl(product.id, variant?.id, transaction),
            variantNameSnapshot: variant?.name ?? null,
            skuSnapshot: variant?.sku ?? null,
            quantity: dto.quantity,
            unitListPrice: variant?.salePrice ?? null,
            unitQuotedPrice: variant?.salePrice ?? null,
            discountAmount: '0.00',
            subtotal: total,
            customization: this.cleanCustomization(dto.customization),
            negotiationReason: null,
            notes: null
          },
          { transaction }
        );

        return this.response(quote);
      });
    } catch (error) {
      const code = (error as { parent?: { code?: string } }).parent?.code;
      if (code === 'ER_LOCK_DEADLOCK' || code === 'ER_LOCK_WAIT_TIMEOUT') {
        // The entire failed transaction has rolled back; retry with the same key.
        if (attempt < 2) return this.create(dto, attempt + 1);
        throw new ConflictException('Request changed concurrently; retry with the same requestId');
      }
      if ((error as { name?: string }).name !== 'SequelizeUniqueConstraintError') throw error;
      const repeated = await this.quotes.findOne({ where: { publicRequestKey: dto.requestId } });
      if (!repeated) throw error;
      return this.replay(repeated, payloadHash);
    }
  }

  private response(quote: Quote) {
    return {
      received: true as const,
      requestCode: quote.code,
      status: QuoteStatus.REQUESTED as const
    };
  }

  private replay(quote: Quote, payloadHash: string) {
    if (quote.publicRequestPayloadHash !== payloadHash) {
      throw new ConflictException('requestId was already used for a different request');
    }
    return this.response(quote);
  }

  private createCustomer(dto: CreatePublicQuoteRequestDto, transaction: Transaction) {
    return this.customers.create(
      {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email || null,
        isActive: true,
        createdByUserId: null,
        updatedByUserId: null
      },
      { transaction }
    );
  }

  private cleanCustomization(customization?: PublicCustomizationDto) {
    if (!customization) return null;
    const entries = Object.entries(customization).filter(
      ([, value]) => typeof value === 'string' && value.length > 0
    );
    return entries.length ? Object.fromEntries(entries) : null;
  }

  private payloadHash(dto: CreatePublicQuoteRequestDto) {
    const cleanCustomization = this.cleanCustomization(dto.customization);
    const customization = cleanCustomization
      ? {
          dimensions: cleanCustomization.dimensions ?? null,
          material: cleanCustomization.material ?? null,
          fabric: cleanCustomization.fabric ?? null,
          color: cleanCustomization.color ?? null,
          finish: cleanCustomization.finish ?? null,
          details: cleanCustomization.details ?? null
        }
      : null;
    const canonical = JSON.stringify({
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email || null,
      productId: dto.productId,
      productVariantId: dto.productVariantId || null,
      quantity: dto.quantity,
      customization,
      message: dto.message || null
    });
    return createHash('sha256').update(canonical).digest('hex');
  }
}
