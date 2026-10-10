import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { Role } from '../auth/entities/role.model';
import { User } from '../auth/entities/user.model';
import { OrderItem } from '../orders/entities/order-item.model';
import { Order } from '../orders/entities/order.model';
import { Customer } from '../quotes/entities/customer.model';
import { WorkshopJobsController } from './workshop-jobs.controller';
import { WorkshopJobsService } from './workshop-jobs.service';
import { WorkshopJob } from './entities/workshop-job.model';
import { WorkshopProgressReport } from './entities/workshop-progress-report.model';
import { AdminWorkshopProgressController, WorkshopOwnJobsController } from './workshop-progress.controller';
import { WorkshopProgressService } from './workshop-progress.service';

@Module({
  imports: [AuthModule, MediaModule, SequelizeModule.forFeature([WorkshopJob, WorkshopProgressReport, OrderItem, Order, User, Role, Customer])],
  controllers: [WorkshopJobsController, WorkshopOwnJobsController, AdminWorkshopProgressController],
  providers: [WorkshopJobsService, WorkshopProgressService]
})
export class WorkshopJobsModule {}
