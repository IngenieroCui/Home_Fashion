import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, type WhereOptions } from 'sequelize';
import { CreateCategoryDto, CreateImageDto, CreateProductDto, CreateVariantDto, type AdminCategoryQueryDto, type AdminProductQueryDto, type UpdateCategoryDto, type UpdateImageDto, type UpdateProductDto, type UpdateVariantDto } from './dto/catalog-admin.dto';
import { Category } from './entities/category.model';
import { ProductImage } from './entities/product-image.model';
import { Product } from './entities/product.model';
import { ProductVariant } from './entities/product-variant.model';
import { resolveSlug } from './utils/slug.util';
import { CloudinaryMediaService } from '../media/cloudinary-media.service';

const productAttributes = ['id', 'categoryId', 'name', 'slug', 'description', 'allowsCustomization', 'status'];
const variantAttributes = ['id', 'productId', 'sku', 'name', 'dimensions', 'material', 'color', 'fabric', 'finish', 'salePrice', 'estimatedCost', 'quantityOnHand', 'quantityReserved', 'location', 'status'];
const imageAttributes = ['id', 'productId', 'productVariantId', 'url', 'publicId', 'altText', 'position', 'isPrimary'];
const normalizeSku = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '-');
const plain = <T>(model: { get(options: { plain: true }): T }): T => model.get({ plain: true });

@Injectable()
export class CatalogAdminService {
  constructor(
    @InjectModel(Category) private readonly categories: typeof Category,
    @InjectModel(Product) private readonly products: typeof Product,
    @InjectModel(ProductVariant) private readonly variants: typeof ProductVariant,
    @InjectModel(ProductImage) private readonly images: typeof ProductImage,
    private readonly cloudinary: CloudinaryMediaService
  ) {}

  private async categoryOrFail(id: string) { const category = await this.categories.findByPk(id); if (!category) throw new NotFoundException('Category not found'); return category; }
  private async productOrFail(id: string) { const product = await this.products.findByPk(id); if (!product) throw new NotFoundException('Product not found'); return product; }
  private async variantOrFail(id: string) { const variant = await this.variants.findByPk(id); if (!variant) throw new NotFoundException('Product variant not found'); return variant; }
  private async imageOrFail(id: string) { const image = await this.images.findByPk(id); if (!image) throw new NotFoundException('Product image not found'); return image; }

  private async ensureSlugAvailable(model: 'category' | 'product', slug: string, exceptId?: string) {
    const existing = model === 'category'
      ? await this.categories.findOne({ where: { slug } })
      : await this.products.findOne({ where: { slug } });
    if (existing && existing.id !== exceptId) throw new ConflictException('Slug already exists');
  }

  private async ensureSkuAvailable(sku: string, exceptId?: string) {
    const existing = await this.variants.findOne({ where: { sku } });
    if (existing && existing.id !== exceptId) throw new ConflictException('SKU already exists');
  }

  private validateInventory(quantityOnHand: number, quantityReserved: number) {
    if (quantityReserved > quantityOnHand) throw new BadRequestException('quantityReserved cannot exceed quantityOnHand');
  }

  private makeSlug(name: string, slug?: string) {
    try { return resolveSlug(name, slug); } catch { throw new BadRequestException('Slug must contain letters or numbers'); }
  }

  async listCategories(query: AdminCategoryQueryDto) {
    const where: WhereOptions = query.q ? { [Op.or]: [{ name: { [Op.like]: `%${query.q}%` } }, { description: { [Op.like]: `%${query.q}%` } }] } : {};
    const result = await this.categories.findAndCountAll({ where, include: [{ model: Product, attributes: ['id'], required: false }], distinct: true, order: [['name', 'ASC']], limit: query.limit, offset: (query.page - 1) * query.limit });
    return { data: result.rows.map((category) => { const value = plain<Record<string, unknown>>(category); const products = (value.products as unknown[] | undefined) ?? []; return { ...value, productCount: products.length, products: undefined }; }), pagination: this.pagination(query.page, query.limit, result.count) };
  }

  async createCategory(dto: CreateCategoryDto) {
    const slug = this.makeSlug(dto.name, dto.slug);
    await this.ensureSlugAvailable('category', slug);
    return plain(await this.categories.create({ ...dto, slug }));
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryOrFail(id);
    const slug = dto.slug ? this.makeSlug(dto.name ?? category.name, dto.slug) : undefined;
    if (slug) await this.ensureSlugAvailable('category', slug, category.id);
    await category.update({ ...dto, ...(slug ? { slug } : {}) });
    return plain(category);
  }

  async listProducts(query: AdminProductQueryDto) {
    const where: Record<PropertyKey, unknown> = {};
    if (query.q) where[Op.or] = [{ name: { [Op.like]: `%${query.q}%` } }, { description: { [Op.like]: `%${query.q}%` } }];
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.status) where.status = query.status;
    if (query.allowsCustomization !== undefined) where.allowsCustomization = query.allowsCustomization;
    const result = await this.products.findAndCountAll({ attributes: productAttributes, where: where as WhereOptions, include: [{ model: Category, attributes: ['id', 'name', 'slug'] }, { model: ProductVariant, attributes: ['id'], required: false }, { model: ProductImage, attributes: imageAttributes, required: false, where: { productVariantId: null, isPrimary: true } }], distinct: true, order: [['name', 'ASC']], limit: query.limit, offset: (query.page - 1) * query.limit });
    return { data: result.rows.map((product) => { const value = plain<Record<string, unknown>>(product); const variants = (value.variants as unknown[] | undefined) ?? []; const images = (value.images as unknown[] | undefined) ?? []; return { ...value, variantCount: variants.length, primaryImage: images[0] ?? null, variants: undefined, images: undefined }; }), pagination: this.pagination(query.page, query.limit, result.count) };
  }

  async createProduct(dto: CreateProductDto) {
    await this.categoryOrFail(dto.categoryId);
    const slug = this.makeSlug(dto.name, dto.slug);
    await this.ensureSlugAvailable('product', slug);
    return plain(await this.products.create({ ...dto, slug }));
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.productOrFail(id);
    if (dto.categoryId) await this.categoryOrFail(dto.categoryId);
    const slug = dto.slug ? this.makeSlug(dto.name ?? product.name, dto.slug) : undefined;
    if (slug) await this.ensureSlugAvailable('product', slug, product.id);
    await product.update({ ...dto, ...(slug ? { slug } : {}) });
    return plain(product);
  }

  async getProduct(id: string) {
    const product = await this.products.findByPk(id, { attributes: productAttributes, include: [{ model: Category, attributes: ['id', 'name', 'slug', 'description', 'isActive'] }, { model: ProductImage, attributes: imageAttributes, required: false, where: { productVariantId: null } }, { model: ProductVariant, attributes: variantAttributes, required: false, include: [{ model: ProductImage, attributes: imageAttributes, required: false }] }], order: [[{ model: ProductImage, as: 'images' }, 'position', 'ASC'], [{ model: ProductVariant, as: 'variants' }, 'sku', 'ASC'], [{ model: ProductVariant, as: 'variants' }, { model: ProductImage, as: 'images' }, 'position', 'ASC']] });
    if (!product) throw new NotFoundException('Product not found');
    return plain(product);
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    await this.productOrFail(productId);
    const sku = normalizeSku(dto.sku);
    await this.ensureSkuAvailable(sku);
    this.validateInventory(dto.quantityOnHand, 0);
    return plain(await this.variants.create({ ...dto, productId, sku, quantityReserved: 0 }));
  }

  async updateVariant(id: string, dto: UpdateVariantDto) {
    return this.variants.sequelize!.transaction(async (transaction) => {
      const variant = await this.variants.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!variant) throw new NotFoundException('Product variant not found');
      const sku = dto.sku ? normalizeSku(dto.sku) : undefined;
      if (sku) await this.ensureSkuAvailable(sku, variant.id);
      this.validateInventory(dto.quantityOnHand ?? variant.quantityOnHand, variant.quantityReserved);
      const { quantityReserved: _reserved, ...fields } = dto as UpdateVariantDto & { quantityReserved?: unknown };
      void _reserved;
      await variant.update({ ...fields, ...(sku ? { sku } : {}) }, { transaction });
      return plain(variant);
    });
  }

  async validateImageTarget(productId: string, productVariantId?: string | null) {
    await this.productOrFail(productId);
    if (productVariantId) { const variant = await this.variantOrFail(productVariantId); if (String(variant.productId) !== String(productId)) throw new BadRequestException('Product variant does not belong to product'); }
  }

  async createImage(productId: string, dto: CreateImageDto) {
    await this.validateImageTarget(productId, dto.productVariantId);
    const attributes = { ...dto, productId, productVariantId: dto.productVariantId ?? null, isPrimary: dto.isPrimary ?? false, position: dto.position ?? 0 };
    if (!attributes.isPrimary) return plain(await this.images.create(attributes));
    return this.images.sequelize!.transaction(async (transaction) => {
      await this.images.update({ isPrimary: false }, { where: { productId, productVariantId: attributes.productVariantId }, transaction });
      return plain(await this.images.create(attributes, { transaction }));
    });
  }

  async updateImage(id: string, dto: UpdateImageDto) {
    const image = await this.imageOrFail(id);
    if (dto.isPrimary !== true) { await image.update(dto); return plain(image); }
    return this.images.sequelize!.transaction(async (transaction) => {
      await this.images.update({ isPrimary: false }, { where: { productId: image.productId, productVariantId: image.productVariantId }, transaction });
      await image.update(dto, { transaction });
      return plain(image);
    });
  }

  async deleteImage(id: string) {
    const image = await this.imageOrFail(id);
    await image.destroy();
    if (image.publicId) await this.cloudinary.destroy(image.publicId);
  }

  private pagination(page: number, limit: number, total: number) { return { page, limit, total, totalPages: Math.ceil(total / limit) }; }
}
