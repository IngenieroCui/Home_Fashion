import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TrackingOrderParamDto {
  @IsString() @IsNotEmpty() orderId!: string;
}

export class PublicTrackingTokenParamDto {
  @IsString() @IsNotEmpty() token!: string;
}

export class CreateTrackingAccessDto {
  @IsOptional() @IsDateString() expiresAt?: string;
}
