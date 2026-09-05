import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateBy
} from 'class-validator';
import { DeliveryStatus, DeliveryType } from '../deliveries.types';

const identifier = (value: unknown) => typeof value === 'number' ? String(value) : value;
const number = (value: unknown) => typeof value === 'string' ? Number(value) : value;
const decimal = (value: unknown) => typeof value === 'number' ? String(value) : value;
const trim = (value: unknown) => typeof value === 'string' ? value.trim() : value;
const IsDeliveryFee = () => ValidateBy({
  name: 'isDeliveryFee',
  validator: {
    validate: (value: unknown) => {
      if (typeof value !== 'string' || !/^\d+(\.\d{1,2})?$/.test(value)) return false;
      const [whole, fraction = ''] = value.split('.');
      const normalizedWhole = whole.replace(/^0+/, '') || '0';
      if (normalizedWhole.length > 10) return false;
      const cents = BigInt(normalizedWhole) * 100n + BigInt(fraction.padEnd(2, '0'));
      return cents <= 999_999_999_999n;
    },
    defaultMessage: () => 'fee must be between 0 and 9999999999.99'
  }
});

class PaginationDto {
  @Transform(({ value }) => number(value)) @IsOptional() @IsInt() @Min(1) page = 1;
  @Transform(({ value }) => number(value)) @IsOptional() @IsInt() @Min(1) @Max(50) limit = 12;
}

export class DeliveryParamDto {
  @IsString() @IsNotEmpty() id!: string;
}

export class DeliveryQueryDto extends PaginationDto {
  @IsOptional() @IsString() @MaxLength(160) q?: string;
  @IsOptional() @IsEnum(DeliveryStatus) status?: DeliveryStatus;
  @IsOptional() @IsEnum(DeliveryType) deliveryType?: DeliveryType;
  @Transform(({ value }) => identifier(value)) @IsOptional() @IsString() assignedUserId?: string;
  @Transform(({ value }) => identifier(value)) @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}

export class DeliveryAssigneeQueryDto extends PaginationDto {
  @IsOptional() @IsString() @MaxLength(160) q?: string;
  @IsIn([DeliveryType.OWNER, DeliveryType.EMPLOYEE]) deliveryType!: DeliveryType.OWNER | DeliveryType.EMPLOYEE;
}

export class CreateDeliveryDto {
  @Transform(({ value }) => identifier(value)) @IsString() @IsNotEmpty() orderId!: string;
  @Transform(({ value }) => trim(value)) @IsString() @IsNotEmpty() @MaxLength(500) address!: string;
  @Transform(({ value }) => trim(value)) @IsOptional() @IsString() @MaxLength(255) addressReference?: string;
  @Transform(({ value }) => trim(value)) @IsString() @IsNotEmpty() @MaxLength(160) contactName!: string;
  @Transform(({ value }) => trim(value)) @IsString() @IsNotEmpty() @MaxLength(40) contactPhone!: string;
  @IsDateString() scheduledDate!: string;
  @Transform(({ value }) => trim(value)) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) timeWindow?: string;
  @IsEnum(DeliveryType) deliveryType!: DeliveryType;
  @Transform(({ value }) => identifier(value)) @IsOptional() @IsString() @IsNotEmpty() assignedUserId?: string;
  @Transform(({ value }) => trim(value)) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(160) externalDriverName?: string;
  @Transform(({ value }) => decimal(value))
  @IsOptional() @IsDeliveryFee() fee?: string;
  @Transform(({ value }) => trim(value)) @IsOptional() @IsString() @MaxLength(4000) notes?: string;
}

export class CompleteDeliveryDto {
  @Transform(({ value }) => trim(value)) @IsString() @IsNotEmpty() @MaxLength(160) receiverName!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5)
  @IsString({ each: true }) @IsNotEmpty({ each: true }) @IsUrl({}, { each: true }) evidenceUrls!: string[];
}
