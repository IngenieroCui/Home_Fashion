import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { WorkshopJobStatus } from '../workshop-jobs.types';

const identifier = (value: unknown) => typeof value === 'number' ? String(value) : value;
const number = (value: unknown) => typeof value === 'string' ? Number(value) : value;

class PaginationDto {
  @Transform(({ value }) => number(value)) @IsOptional() @IsInt() @Min(1) page = 1;
  @Transform(({ value }) => number(value)) @IsOptional() @IsInt() @Min(1) @Max(50) limit = 12;
}

export class WorkshopUserQueryDto extends PaginationDto {
  @IsOptional() @IsString() @MaxLength(160) q?: string;
}

export class CreateWorkshopJobDto {
  @Transform(({ value }) => identifier(value)) @IsString() @IsNotEmpty() orderItemId!: string;
  @Transform(({ value }) => identifier(value)) @IsString() @IsNotEmpty() workshopUserId!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString() @IsNotEmpty() @MaxLength(4000) instructions?: string;
  @IsOptional() @IsDateString() expectedCompletionDate?: string;
}

export class WorkshopJobParamDto {
  @IsString() @IsNotEmpty() id!: string;
}

export class WorkshopJobQueryDto extends PaginationDto {
  @IsOptional() @IsString() @MaxLength(160) q?: string;
  @Transform(({ value }) => identifier(value)) @IsOptional() @IsString() workshopUserId?: string;
  @IsOptional() @IsEnum(WorkshopJobStatus) status?: WorkshopJobStatus;
  @Transform(({ value }) => identifier(value)) @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsDateString() expectedDateFrom?: string;
  @IsOptional() @IsDateString() expectedDateTo?: string;
}
