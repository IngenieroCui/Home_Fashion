import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, type FindAndCountOptions, type WhereOptions } from 'sequelize';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { Category } from './entities/category.model';
import { ProductImage } from './entities/product-image.model';
import { Product } from './entities/product.model';
import { ProductVariant } from './entities/product-variant.model';
import { CatalogStatus } from './catalog.types';

const publicProductAttributes = ['id', 'name', 'slug', 'description', 'allowsCustomization'];
const publicVariantAttributes = ['id', 'sku', 'name', 'dimensions', 'material', 'color', 'fabric', 'finish', 'salePrice', 'quantityOnHand', 'quantityReserved', 'location', 'status'];
const publicImageAttributes = ['id', 'url', 'altText', 'position', 'isPrimary'];

@Injectable()
export class CatalogService {
  constructor(
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(Product) private readonly productModel: typeof Product
  ) {}

  async listCategories() {
    return this.categoryModel.findAll({
      attributes: ['id', 'name', 'slug', 'description'],
      where: { isActive: true },
      include: [{ model: Product, attributes: [], required: true, where: { status: CatalogStatus.ACTIVE } }],
      order: [['name', 'ASC']],
      group: ['Category.id']
    });
  }

  async listProducts(query: CatalogQueryDto) {
    const where: Record<PropertyKey, unknown> = { status: CatalogStatus.ACTIVE };
    if (query.q) {
      where[Op.or] = [
        { name: { [Op.like]: `%${query.q}%` } },
        { description: { [Op.like]: `%${query.q}%` } }
      ];
    }
    if (query.allowsCustomization !== undefined) where.allowsCustomization = query.allowsCustomization;

    const variantInclude = {
      model: ProductVariant,
      attributes: publicVariantAttributes,
      required: query.inStock === true,
      where: { status: CatalogStatus.ACTIVE, ...(query.inStock ? { quantityOnHand: { [Op.gt]: 0 } } : {}) }
    };
    if (query.inStock) {
      (variantInclude.where as Record<PropertyKey, unknown>)[Op.and] = [
        this.productModel.sequelize!.literal('`variants`.`quantity_on_hand` > `variants`.`quantity_reserved`')
      ];
    }

    const options: FindAndCountOptions = {
      attributes: publicProductAttributes,
      where: where as WhereOptions,
      include: [
        { model: Category, attributes: ['id', 'name', 'slug'], required: true, where: query.category ? { slug: query.category, isActive: true } : { isActive: true } },
        variantInclude,
        { model: ProductImage, attributes: publicImageAttributes, required: false, where: { productVariantId: null } }
      ],
      distinct: true,
      order: [['name', 'ASC'], [{ model: ProductImage, as: 'images' }, 'position', 'ASC']],
      limit: query.limit,
      offset: (query.page - 1) * query.limit
    };
    const result = await this.productModel.findAndCountAll(options);
    return { data: result.rows, pagination: { page: query.page, limit: query.limit, total: result.count, totalPages: Math.ceil(result.count / query.limit) } };
  }

  async getProductBySlug(slug: string) {
    const product = await this.productModel.findOne({
      attributes: publicProductAttributes,
      where: { slug, status: CatalogStatus.ACTIVE },
      include: [
        { model: Category, attributes: ['id', 'name', 'slug', 'description'], required: true, where: { isActive: true } },
        { model: ProductImage, attributes: publicImageAttributes, required: false, where: { productVariantId: null } },
        { model: ProductVariant, attributes: publicVariantAttributes, required: false, where: { status: CatalogStatus.ACTIVE }, include: [{ model: ProductImage, attributes: publicImageAttributes, required: false }] }
      ],
      order: [[{ model: ProductImage, as: 'images' }, 'position', 'ASC'], [{ model: ProductVariant, as: 'variants' }, 'sku', 'ASC'], [{ model: ProductVariant, as: 'variants' }, { model: ProductImage, as: 'images' }, 'position', 'ASC']]
    });
    if (!product) throw new NotFoundException('Product not found');
    const plain = product.get({ plain: true }) as Record<string, unknown>;
    const variants = (plain.variants as Array<Record<string, unknown>> | undefined) ?? [];
    plain.variants = variants.map(({ quantityOnHand, quantityReserved, ...variant }) => ({ ...variant, availability: Number(quantityOnHand) - Number(quantityReserved) }));
    return plain;
  }
}
