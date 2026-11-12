import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/security/current-user.decorator';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { RequirePermissions } from '../auth/security/permissions.decorator';
import { CatalogVariantFieldsGuard, requireVariantFields } from './catalog-variant-fields.guard';
import { InventoryAdjustmentDto } from './inventory-adjustment';
import { CatalogAdminService } from './catalog-admin.service';
import { CATALOG_MANAGE_PERMISSION } from './catalog-admin.types';
import { MediaCleanupService } from '../media/media-cleanup.service';
import { CloudinaryMediaService } from '../media/cloudinary-media.service';
import { AdminCategoryQueryDto, AdminProductQueryDto, CreateCategoryDto, CreateImageDto, CreateProductDto, CreateVariantDto, IdParamDto, ProductIdParamDto, UpdateCategoryDto, UpdateImageDto, UpdateProductDto, UpdateVariantDto } from './dto/catalog-admin.dto';

@Controller('admin/catalog')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(CATALOG_MANAGE_PERMISSION)
export class CatalogAdminController {
  constructor(private readonly catalog: CatalogAdminService, private readonly cloudinary: CloudinaryMediaService, private readonly auth: AuthService, private readonly cleanup: MediaCleanupService) {}

  private present(value: unknown, permissions: string[]) {
    if (permissions.includes('FINANCIAL_COST_VIEW')) return value;
    const stripCost = (item: unknown): unknown => {
      if (item instanceof Date || item === null || typeof item !== 'object') return item;
      if (Array.isArray(item)) return item.map(stripCost);
      return Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'estimatedCost').map(([key, field]) => [key, stripCost(field)]));
    };
    return stripCost(value);
  }

  @Get('categories') listCategories(@Query() query: AdminCategoryQueryDto) { return this.catalog.listCategories(query); }
  @Post('categories') createCategory(@Body() body: CreateCategoryDto) { return this.catalog.createCategory(body); }
  @Patch('categories/:id') updateCategory(@Param() params: IdParamDto, @Body() body: UpdateCategoryDto) { return this.catalog.updateCategory(params.id, body); }

  @Get('products') listProducts(@Query() query: AdminProductQueryDto) { return this.catalog.listProducts(query); }
  @Post('products') createProduct(@Body() body: CreateProductDto) { return this.catalog.createProduct(body); }
  @Get('products/:id') async getProduct(@Param() params: IdParamDto, @CurrentUser() user: { id: string }) { return this.present(await this.catalog.getProduct(params.id), (await this.auth.getAuthenticatedUser(user.id)).permissions); }
  @Patch('products/:id') updateProduct(@Param() params: IdParamDto, @Body() body: UpdateProductDto) { return this.catalog.updateProduct(params.id, body); }

  @Post('products/:productId/variants')
  @UseGuards(CatalogVariantFieldsGuard)
  async createVariant(@Param() params: ProductIdParamDto, @Body() body: CreateVariantDto, @CurrentUser() user: { id: string; catalogPermissions?: string[] }) {
    const permissions = user.catalogPermissions ?? (await this.auth.getAuthenticatedUser(user.id)).permissions;
    requireVariantFields(body.estimatedCost === undefined ? {} : { estimatedCost: body.estimatedCost }, permissions, true);
    return this.present(await this.catalog.createVariant(params.productId, body, user.id), permissions);
   }
  @Patch('variants/:id')
  @UseGuards(CatalogVariantFieldsGuard)
  async updateVariant(@Param() params: IdParamDto, @Body() body: UpdateVariantDto, @CurrentUser() user: { id: string; catalogPermissions?: string[] }) {
    const permissions = user.catalogPermissions ?? (await this.auth.getAuthenticatedUser(user.id)).permissions;
    if (body.salePrice !== undefined) requireVariantFields({ salePrice: body.salePrice }, permissions);
    if (body.estimatedCost !== undefined) requireVariantFields({ estimatedCost: body.estimatedCost }, permissions);
    if (body.salePrice === null) throw new BadRequestException('El precio de venta es obligatorio');
    return this.present(await this.catalog.updateVariant(params.id, body), permissions);
   }


  @Get('variants/:id/inventory-movements')
  inventoryMovements(@Param() params: IdParamDto) { return this.catalog.inventoryMovements(params.id); }

  @Post('variants/:id/inventory-movements')
  adjustInventory(@Param() params: IdParamDto, @Body() body: InventoryAdjustmentDto, @CurrentUser() user: { id: string }) {
    return this.catalog.adjustInventory(params.id, body, user.id);
  }

  @Post('products/:productId/images') createImage(@Param() params: ProductIdParamDto, @Body() body: CreateImageDto) { if (body.publicId !== undefined || this.cloudinary.isManagedCatalogUrl(body.url)) throw new BadRequestException('El identificador lo asigna la carga de imágenes');
    return this.catalog.createImage(params.productId, body); }
  @Post('products/:productId/images/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadImage(
    @Param() params: ProductIdParamDto,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string } | undefined,
    @Body() body: { productVariantId?: string; altText?: string; isPrimary?: string }
  ) {
    if (!file || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      throw new BadRequestException('Selecciona una imagen JPG, PNG, WebP o GIF de hasta 10 MB');
    }
    if (body.isPrimary && !['true', 'false'].includes(body.isPrimary)) throw new BadRequestException('isPrimary debe ser true o false');
    await this.catalog.validateImageTarget(params.productId, body.productVariantId);
    const product = await this.catalog.getProduct(params.productId) as { slug: string };
    const uploaded = await this.cloudinary.uploadImage(file, 'products', product.slug);
    try {
      return await this.catalog.createImage(params.productId, {
        url: uploaded.secureUrl,
        publicId: uploaded.publicId,
        productVariantId: body.productVariantId || undefined,
        altText: body.altText,
        isPrimary: body.isPrimary === 'true'
      });
    } catch (error) {
      await this.cleanup.scheduleRollback('products', [uploaded.publicId]);
      throw error;
    }
  }
  @Patch('images/:id') updateImage(@Param() params: IdParamDto, @Body() body: UpdateImageDto) { if (body.publicId !== undefined || body.url !== undefined) throw new BadRequestException('Para cambiar una imagen, agrega una nueva');
    return this.catalog.updateImage(params.id, body); }
  @Delete('images/:id') deleteImage(@Param() params: IdParamDto) { return this.catalog.deleteImage(params.id); }
}
