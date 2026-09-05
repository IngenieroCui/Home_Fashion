import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.model';
import { ProductVariant } from '../catalog/entities/product-variant.model';
import { Customer } from '../quotes/entities/customer.model';
import { SaleItem } from '../sales/entities/sale-item.model';
import { Sale } from '../sales/entities/sale.model';
import { OrdersController } from './orders.controller';
import { OrderItem } from './entities/order-item.model';
import { Order } from './entities/order.model';
import { OrdersService } from './orders.service';
import { WorkshopJob } from '../workshop-jobs/entities/workshop-job.model';

@Module({
  imports: [AuthModule, SequelizeModule.forFeature([Order, OrderItem, Sale, SaleItem, ProductVariant, Customer, User, WorkshopJob])],
  controllers: [OrdersController],
  providers: [OrdersService]
})
export class OrdersModule {}
