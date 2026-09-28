import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested
} from 'class-validator';
import {
  SalePaymentAdjustmentEffect,
  SalePaymentMethod,
  SalePaymentType,
  SaleStatus
} from '../sales.types';
const number = (value: unknown) => (typeof value === 'string' ? Number(value) : value);
const identifier = (value: unknown) => (typeof value === 'number' ? String(value) : value);
const decimal = (value: unknown) =>
  typeof value === 'number' || typeof value === 'string' ? String(value) : value;
class PaginationDto {
  @Transform(({ value }) => number(value)) @IsOptional() @IsInt() @Min(1) page = 1;
  @Transform(({ value }) => number(value)) @IsOptional() @IsInt() @Min(1) @Max(50) limit = 12;
}
export class SaleItemInputDto {
  @Transform(({ value }) => identifier(value)) @IsString() @IsNotEmpty() productId!: string;
  @Transform(({ value }) => identifier(value)) @IsOptional() @IsString() productVariantId?: string;
  @Transform(({ value }) => number(value)) @IsInt() @Min(1) quantity!: number;
  @Transform(({ value }) => decimal(value))
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  unitSalePrice?: string;
  @IsOptional() @IsObject() customization?: Record<string, unknown>;
  @IsOptional() @IsString() negotiationReason?: string;
  @IsOptional() @IsString() belowCostReason?: string;
  @IsOptional() @IsString() notes?: string;
}
export class CreateSaleDto {
  @Transform(({ value }) => identifier(value)) @IsString() @IsNotEmpty() customerId!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items!: SaleItemInputDto[];
  @Transform(({ value }) => decimal(value))
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  deliveryFee?: string;
  @IsOptional() @IsString() notes?: string;
}
export class IdParamDto {
  @IsString() @IsNotEmpty() id!: string;
}
export class QuoteParamDto {
  @IsString() @IsNotEmpty() quoteId!: string;
}
export class RegisterSalePaymentDto {
  @IsEnum(SalePaymentType) type!: SalePaymentType;
  @IsEnum(SalePaymentMethod) method!: SalePaymentMethod;
  @Transform(({ value }) => decimal(value))
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;
  @IsDateString() paidAt!: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() evidenceUrl?: string;
  @IsOptional() @IsEnum(SalePaymentAdjustmentEffect)
  adjustmentEffect?: SalePaymentAdjustmentEffect;
}
export class SalePaymentParamDto {
  @IsString() @IsNotEmpty() saleId!: string;
  @IsString() @IsNotEmpty() paymentId!: string;
}
export class VoidSalePaymentDto {
  @IsString() @IsNotEmpty() reason!: string;
}
export class SaleQueryDto extends PaginationDto {
  @IsOptional() @IsString() q?: string;
  @Transform(({ value }) => identifier(value)) @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsEnum(SaleStatus) status?: SaleStatus;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}
