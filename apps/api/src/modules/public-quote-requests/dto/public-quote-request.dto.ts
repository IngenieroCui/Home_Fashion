import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from 'class-validator';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const normalizedEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const normalizedId = ({ value }: { value: unknown }) =>
  typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : value;

export class PublicCustomizationDto {
  @Transform(trimmed) @IsOptional() @IsString() @MaxLength(160) dimensions?: string;
  @Transform(trimmed) @IsOptional() @IsString() @MaxLength(160) material?: string;
  @Transform(trimmed) @IsOptional() @IsString() @MaxLength(120) fabric?: string;
  @Transform(trimmed) @IsOptional() @IsString() @MaxLength(100) color?: string;
  @Transform(trimmed) @IsOptional() @IsString() @MaxLength(120) finish?: string;
  @Transform(trimmed) @IsOptional() @IsString() @MaxLength(500) details?: string;
}

export class CreatePublicQuoteRequestDto {
  @Transform(trimmed)
  @IsUUID('4')
  requestId!: string;

  @Transform(trimmed)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(180)
  fullName!: string;

  @Transform(trimmed)
  @IsString()
  @Matches(/^(?=(?:\D*\d){7,})[+0-9() .-]{7,60}$/)
  phone!: string;

  @Transform(normalizedEmail)
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @Transform(normalizedId)
  @IsNumberString({ no_symbols: true })
  @MaxLength(20)
  productId!: string;

  @Transform(normalizedId)
  @IsOptional()
  @IsNumberString({ no_symbols: true })
  @MaxLength(20)
  productVariantId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PublicCustomizationDto)
  customization?: PublicCustomizationDto;

  @Transform(trimmed)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
