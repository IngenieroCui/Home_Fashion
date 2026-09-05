import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogQueryDto, ProductSlugDto } from './dto/catalog-query.dto';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}
  @Get('categories') listCategories() { return this.catalogService.listCategories(); }
  @Get('products') listProducts(@Query() query: CatalogQueryDto) { return this.catalogService.listProducts(query); }
  @Get('products/:slug') getProduct(@Param() params: ProductSlugDto) { return this.catalogService.getProductBySlug(params.slug); }
}
