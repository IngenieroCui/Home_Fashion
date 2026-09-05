import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { RequirePermissions } from '../auth/security/permissions.decorator';
import { CatalogAdminService } from './catalog-admin.service';
import { CATALOG_MANAGE_PERMISSION } from './catalog-admin.types';
import { AdminCategoryQueryDto, AdminProductQueryDto, CreateCategoryDto, CreateImageDto, CreateProductDto, CreateVariantDto, IdParamDto, ProductIdParamDto, UpdateCategoryDto, UpdateImageDto, UpdateProductDto, UpdateVariantDto } from './dto/catalog-admin.dto';

@Controller('admin/catalog')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(CATALOG_MANAGE_PERMISSION)
export class CatalogAdminController {
  constructor(private readonly catalog: CatalogAdminService) {}

  @Get('categories') listCategories(@Query() query: AdminCategoryQueryDto) { return this.catalog.listCategories(query); }
  @Post('categories') createCategory(@Body() body: CreateCategoryDto) { return this.catalog.createCategory(body); }
  @Patch('categories/:id') updateCategory(@Param() params: IdParamDto, @Body() body: UpdateCategoryDto) { return this.catalog.updateCategory(params.id, body); }

  @Get('products') listProducts(@Query() query: AdminProductQueryDto) { return this.catalog.listProducts(query); }
  @Post('products') createProduct(@Body() body: CreateProductDto) { return this.catalog.createProduct(body); }
  @Get('products/:id') getProduct(@Param() params: IdParamDto) { return this.catalog.getProduct(params.id); }
  @Patch('products/:id') updateProduct(@Param() params: IdParamDto, @Body() body: UpdateProductDto) { return this.catalog.updateProduct(params.id, body); }

  @Post('products/:productId/variants') createVariant(@Param() params: ProductIdParamDto, @Body() body: CreateVariantDto) { return this.catalog.createVariant(params.productId, body); }
  @Patch('variants/:id') updateVariant(@Param() params: IdParamDto, @Body() body: UpdateVariantDto) { return this.catalog.updateVariant(params.id, body); }

  @Post('products/:productId/images') createImage(@Param() params: ProductIdParamDto, @Body() body: CreateImageDto) { return this.catalog.createImage(params.productId, body); }
  @Patch('images/:id') updateImage(@Param() params: IdParamDto, @Body() body: UpdateImageDto) { return this.catalog.updateImage(params.id, body); }
  @Delete('images/:id') deleteImage(@Param() params: IdParamDto) { return this.catalog.deleteImage(params.id); }
}
