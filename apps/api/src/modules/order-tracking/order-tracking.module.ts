import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from '../auth/auth.module';
import { OrderItem } from '../orders/entities/order-item.model';
import { Order } from '../orders/entities/order.model';
import { WorkshopJob } from '../workshop-jobs/entities/workshop-job.model';
import { WorkshopProgressReport } from '../workshop-jobs/entities/workshop-progress-report.model';
import { AdminOrderTrackingController, PublicOrderTrackingController } from './order-tracking.controller';
import { OrderTrackingAccess } from './entities/order-tracking-access.model';
import { OrderTrackingService } from './order-tracking.service';

@Module({
  imports: [AuthModule, SequelizeModule.forFeature([OrderTrackingAccess, Order, OrderItem, WorkshopJob, WorkshopProgressReport])],
  controllers: [AdminOrderTrackingController, PublicOrderTrackingController],
  providers: [OrderTrackingService]
})
export class OrderTrackingModule {}
