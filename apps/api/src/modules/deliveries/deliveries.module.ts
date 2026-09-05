import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from '../auth/auth.module';
import { Role } from '../auth/entities/role.model';
import { User } from '../auth/entities/user.model';
import { OrderItem } from '../orders/entities/order-item.model';
import { Order } from '../orders/entities/order.model';
import { Customer } from '../quotes/entities/customer.model';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { Delivery } from './entities/delivery.model';

@Module({
  imports: [AuthModule, SequelizeModule.forFeature([Delivery, Order, OrderItem, Customer, User, Role])],
  controllers: [DeliveriesController],
  providers: [DeliveriesService]
})
export class DeliveriesModule {}
