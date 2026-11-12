import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Matches, Max, Min } from 'class-validator';
import { CatalogStatus } from '../catalog.types';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const toBoolean = (value: unknown): unknown => value === 'true' ? true : value === 'false' ? false : value;
const toNumber = (value: unknown): unknown => typeof value === 'string' ? Number(value) : value;
const toIdentifier = (value: unknown): unknown => typeof value === 'number' ? String(value) : value;

class PaginationDto {
  @Transform(({ value }) => toNumber(value)) @IsOptional() @IsInt() @Min(1)
  page = 1;

  @Transform(({ value }) => toNumber(value)) @IsOptional() @IsInt() @Min(1) @Max(50)
  limit = 12;
}

export class AdminCategoryQueryDto extends PaginationDto {
  @IsOptional() @IsString() q?: string;
}

export class AdminProductQueryDto extends PaginationDto {
  @IsOptional() @IsString() q?: string;
  @Transform(({ value }) => toIdentifier(value)) @IsOptional() @IsString() @IsNotEmpty() categoryId?: string;
  @IsOptional() @IsEnum(CatalogStatus) status?: CatalogStatus;
  @Transform(({ value }) => toBoolean(value)) @IsOptional() @IsBoolean() allowsCustomization?: boolean;
}

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() @Matches(slugPattern) slug?: string;
  @IsOptional() @IsString() description?: string;
  @Transform(({ value }) => toBoolean(value)) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() @Matches(slugPattern) slug?: string;
  @IsOptional() @IsString() description?: string;
  @Transform(({ value }) => toBoolean(value)) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateProductDto {
  @Transform(({ value }) => toIdentifier(value)) @IsString() @IsNotEmpty() categoryId!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() @Matches(slugPattern) slug?: string;
  @IsString() @IsNotEmpty() description!: string;
  @Transform(({ value }) => toBoolean(value)) @IsBoolean() allowsCustomization!: boolean;
  @IsEnum(CatalogStatus) status!: CatalogStatus;
}

export class UpdateProductDto {
  @Transform(({ value }) => toIdentifier(value)) @IsOptional() @IsString() @IsNotEmpty() categoryId?: string;
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() @Matches(slugPattern) slug?: string;
  @IsOptional() @IsString() @IsNotEmpty() description?: string;
  @Transform(({ value }) => toBoolean(value)) @IsOptional() @IsBoolean() allowsCustomization?: boolean;
  @IsOptional() @IsEnum(CatalogStatus) status?: CatalogStatus;
}

class VariantFieldsDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() dimensions?: string;
  @IsOptional() @IsString() material?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() fabric?: string;
  @IsOptional() @IsString() finish?: string;
  @Transform(({ value }) => toNumber(value)) @IsOptional() @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0.01) @Max(9999999999.99) salePrice?: number;
  @Transform(({ value }) => toNumber(value)) @IsOptional() @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) @Max(9999999999.99) estimatedCost?: number | null;
  @Transform(({ value }) => toNumber(value)) @IsOptional() @IsInt() @Min(0) quantityOnHand?: number;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsEnum(CatalogStatus) status?: CatalogStatus;
}

export class CreateVariantDto extends VariantFieldsDto {
  @IsString() @IsNotEmpty() sku!: string;
  @Transform(({ value }) => toNumber(value)) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0.01) @Max(9999999999.99) declare salePrice: number;
  @Transform(({ value }) => toNumber(value)) @IsInt() @Min(0) declare quantityOnHand: number;
}

export class UpdateVariantDto extends VariantFieldsDto {
  @IsOptional() @IsString() @IsNotEmpty() sku?: string;
}

export class CreateImageDto {
  @Transform(({ value }) => toIdentifier(value)) @IsOptional() @IsString() @IsNotEmpty() productVariantId?: string | null;
  @IsUrl({ require_tld: false }) url!: string;
  @IsOptional() @IsString() publicId?: string | null;
  @IsOptional() @IsString() altText?: string;
  @Transform(({ value }) => toNumber(value)) @IsOptional() @IsInt() @Min(0) position?: number;
  @Transform(({ value }) => toBoolean(value)) @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class UpdateImageDto {
  @IsOptional() @IsUrl({ require_tld: false }) url?: string;
  @IsOptional() @IsString() publicId?: string | null;
  @IsOptional() @IsString() altText?: string;
  @Transform(({ value }) => toNumber(value)) @IsOptional() @IsInt() @Min(0) position?: number;
  @Transform(({ value }) => toBoolean(value)) @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class IdParamDto {
  @IsString() @IsNotEmpty() id!: string;
}

export class ProductIdParamDto {
  @IsString() @IsNotEmpty() productId!: string;
}
