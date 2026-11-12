import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from '../auth/auth.module';
import { SalesModule } from '../sales/sales.module';
import { Sale } from '../sales/entities/sale.model';
import { PaymentAttempt } from './payment-attempt.model';
import { PaymentAttemptsController, PublicPaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WompiAdapter } from './wompi.adapter';
@Module({
  imports: [AuthModule, SalesModule, SequelizeModule.forFeature([Sale, PaymentAttempt])],
  controllers: [PaymentAttemptsController, PublicPaymentsController],
  providers: [PaymentsService, WompiAdapter]
})
export class PaymentsModule {}
