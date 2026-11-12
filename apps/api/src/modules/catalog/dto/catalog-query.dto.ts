import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

function toBoolean(value: unknown): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class CatalogQueryDto {
  @Transform(({ value }) => Number(value)) @IsOptional() @IsInt() @Min(1)
  page = 1;

  @Transform(({ value }) => Number(value)) @IsOptional() @IsInt() @Min(1) @Max(50)
  limit = 12;

  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) category?: string;
  @Transform(({ value }) => toBoolean(value)) @IsOptional() @IsBoolean() allowsCustomization?: boolean;
  @Transform(({ value }) => toBoolean(value)) @IsOptional() @IsBoolean() inStock?: boolean;
  @IsOptional() @IsIn(['name', 'newest', 'price-asc', 'price-desc'])
  sort?: 'name' | 'newest' | 'price-asc' | 'price-desc';
  @Transform(({ value }) => Number(value)) @IsOptional() @IsInt() @Min(0) minPrice?: number;
  @Transform(({ value }) => Number(value)) @IsOptional() @IsInt() @Min(0) maxPrice?: number;
}

export class ProductSlugDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
}
