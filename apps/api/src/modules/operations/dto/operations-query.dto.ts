import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CatalogStatus } from '../../catalog/catalog.types';

export class OperationsQueryDto {
  @IsOptional() @IsString() @MaxLength(180) q?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsEnum(CatalogStatus) status?: CatalogStatus;
  @IsOptional() @IsIn(['ALL', 'OUT_OF_STOCK', 'LOW_STOCK', 'AVAILABLE', 'RESERVED']) alert?: string;
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 12;
}
