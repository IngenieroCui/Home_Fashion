import { CatalogModule } from '../catalog/catalog.module';
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Product } from '../catalog/entities/product.model';
import { ProductVariant } from '../catalog/entities/product-variant.model';
import { Customer } from '../quotes/entities/customer.model';
import { QuoteItem } from '../quotes/entities/quote-item.model';
import { Quote } from '../quotes/entities/quote.model';
import { PublicQuoteRequestsController } from './public-quote-requests.controller';
import { PublicQuoteRequestsService } from './public-quote-requests.service';

@Module({
  imports: [CatalogModule, SequelizeModule.forFeature([Customer, Quote, QuoteItem, Product, ProductVariant])],
  controllers: [PublicQuoteRequestsController],
  providers: [PublicQuoteRequestsService]
})
export class PublicQuoteRequestsModule {}
