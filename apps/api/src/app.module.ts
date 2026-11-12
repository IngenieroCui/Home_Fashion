import { OperationsModule } from './modules/operations/operations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { environmentValidationSchema } from './config/environment.validation';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { CatalogModule } from './modules/catalog/catalog.module';
import { AuthModule } from './modules/auth/auth.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { SalesModule } from './modules/sales/sales.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WorkshopJobsModule } from './modules/workshop-jobs/workshop-jobs.module';
import { OrderTrackingModule } from './modules/order-tracking/order-tracking.module';
import { PublicQuoteRequestsModule } from './modules/public-quote-requests/public-quote-requests.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [resolve(__dirname, '../../../.env'), resolve(process.cwd(), '.env')],
      validationSchema: environmentValidationSchema,
      validationOptions: {
        abortEarly: false
      }
    }),
    DatabaseModule,
    AuthModule,
    CatalogModule,
    QuotesModule,
    SalesModule,
    PaymentsModule,
    OrdersModule,
    WorkshopJobsModule,
    OrderTrackingModule,
    PublicQuoteRequestsModule,
    DeliveriesModule,
    OperationsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
