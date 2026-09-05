import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.model';
import { Product } from '../catalog/entities/product.model';
import { ProductVariant } from '../catalog/entities/product-variant.model';
import { Customer } from '../quotes/entities/customer.model';
import { QuoteItem } from '../quotes/entities/quote-item.model';
import { Quote } from '../quotes/entities/quote.model';
import { SaleItem } from './entities/sale-item.model';
import { SalePayment } from './entities/sale-payment.model';
import { Sale } from './entities/sale.model';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [
    AuthModule,
    SequelizeModule.forFeature([
      Sale,
      SaleItem,
      SalePayment,
      Customer,
      Quote,
      QuoteItem,
      Product,
      ProductVariant,
      User
    ])
  ],
  controllers: [SalesController],
  providers: [SalesService]
})
export class SalesModule {}
