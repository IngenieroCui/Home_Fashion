import { Transform, Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { OrderStatus, OrderSupplyType } from '../orders.types';

const identifier = (value: unknown) => typeof value === 'number' ? String(value) : value;
const number = (value: unknown) => typeof value === 'string' ? Number(value) : value;

export class OrderItemInputDto {
  @Transform(({ value }) => identifier(value)) @IsString() @IsNotEmpty() saleItemId!: string;
  @IsEnum(OrderSupplyType) supplyType!: OrderSupplyType;
  @IsOptional() @IsString() notes?: string;
}

export class CreateOrderFromSaleDto {
  @IsOptional() @IsDateString() promisedDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemInputDto) items!: OrderItemInputDto[];
}

export class SaleParamDto { @IsString() @IsNotEmpty() saleId!: string; }
export class OrderParamDto { @IsString() @IsNotEmpty() id!: string; }
class PaginationDto {
  @Transform(({ value }) => number(value)) @IsOptional() @IsInt() @Min(1) page = 1;
  @Transform(({ value }) => number(value)) @IsOptional() @IsInt() @Min(1) @Max(50) limit = 12;
}
export class OrderQueryDto extends PaginationDto {
  @IsOptional() @IsString() q?: string;
  @Transform(({ value }) => identifier(value)) @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}
