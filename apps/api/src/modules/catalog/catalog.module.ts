import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CatalogController } from './catalog.controller';
import { CatalogVariantFieldsGuard } from './catalog-variant-fields.guard';
import { CatalogAdminController } from './catalog-admin.controller';
import { CatalogAdminService } from './catalog-admin.service';
import { CatalogService } from './catalog.service';
import { AuthModule } from '../auth/auth.module';
import { Category } from './entities/category.model';
import { ProductImage } from './entities/product-image.model';
import { Product } from './entities/product.model';
import { ProductVariant } from './entities/product-variant.model';
import { MediaModule } from '../media/media.module';
import { CatalogImageResolverService } from './catalog-image-resolver.service';

@Module({ imports: [AuthModule, MediaModule, SequelizeModule.forFeature([Category, Product, ProductVariant, ProductImage])], controllers: [CatalogController, CatalogAdminController], providers: [CatalogVariantFieldsGuard, CatalogService, CatalogAdminService, CatalogImageResolverService], exports: [CatalogImageResolverService] })
export class CatalogModule {}
