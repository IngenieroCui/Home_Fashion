import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/security/current-user.decorator';
import { JwtAuthGuard } from '../auth/security/jwt-auth.guard';
import { PermissionsGuard } from '../auth/security/permissions.guard';
import { RequirePermissions } from '../auth/security/permissions.decorator';
import { IdParamDto } from '../sales/dto/sales.dto';
import { OperationsQueryDto } from './dto/operations-query.dto';
import { OperationsService } from './operations.service';

@Controller('admin/operations')
@UseGuards(JwtAuthGuard)
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}
  @Get('overview') overview(@CurrentUser() user: { id: string }) {
    return this.operations.overview(user.id);
  }
  @Get('inventory')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('CATALOG_MANAGE')
  inventory(@Query() query: OperationsQueryDto, @CurrentUser() user: { id: string }) {
    return this.operations.inventory(query, user.id);
  }
  @Get('customers/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('CUSTOMER_MANAGE')
  customer(@Param() params: IdParamDto, @CurrentUser() user: { id: string }) {
    return this.operations.customer(params.id, user.id);
  }
  @Get('sales/:id/order-preparation')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('ORDER_MANAGE')
  preparation(@Param() params: IdParamDto, @CurrentUser() user: { id: string }) {
    return this.operations.orderPreparation(params.id, user.id);
  }
}
