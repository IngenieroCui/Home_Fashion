import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { WorkshopJobStatus, WorkshopProgressReportType, WorkshopProgressReviewStatus } from '../workshop-jobs.types';

const number = (value: unknown) => typeof value === 'string' ? Number(value) : value;
const identifier = (value: unknown) => typeof value === 'number' ? String(value) : value;

class PaginationDto {
  @Transform(({ value }) => number(value)) @IsOptional() @IsInt() @Min(1) page = 1;
  @Transform(({ value }) => number(value)) @IsOptional() @IsInt() @Min(1) @Max(50) limit = 12;
}

export class WorkshopProgressJobParamDto { @IsString() @IsNotEmpty() id!: string; }

export class SubmitWorkshopProgressDto {
  @IsEnum(WorkshopProgressReportType) type!: WorkshopProgressReportType;
  @IsOptional() @IsString() @Matches(/^[a-f0-9]{32}$/) requestId?: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(4000) message!: string;
  @Transform(({ value }) => number(value)) @IsOptional() @IsInt() @Min(0) @Max(100) progressPercent?: number;
}

export class WorkshopOwnJobsQueryDto extends PaginationDto {
  @IsOptional() @IsString() @MaxLength(160) q?: string;
  @IsOptional() @IsEnum(WorkshopJobStatus) status?: WorkshopJobStatus;
}

export class AdminWorkshopProgressQueryDto extends PaginationDto {
  @IsOptional() @IsString() @MaxLength(160) q?: string;
  @IsOptional() @IsEnum(WorkshopProgressReviewStatus) reviewStatus?: WorkshopProgressReviewStatus;
  @IsOptional() @IsEnum(WorkshopProgressReportType) type?: WorkshopProgressReportType;
  @Transform(({ value }) => identifier(value)) @IsOptional() @IsString() workshopUserId?: string;
  @Transform(({ value }) => identifier(value)) @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}

export enum WorkshopProgressReviewDecision { APPROVE = 'APPROVE', REJECT = 'REJECT' }
export class ReviewWorkshopProgressDto {
  @IsEnum(WorkshopProgressReviewDecision) decision!: WorkshopProgressReviewDecision;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf((object: ReviewWorkshopProgressDto) => object.decision === WorkshopProgressReviewDecision.REJECT || object.comment !== undefined)
  @IsString() @IsNotEmpty() @MaxLength(4000) comment?: string;
}

export class WorkshopProgressReportParamDto { @IsString() @IsNotEmpty() id!: string; }
