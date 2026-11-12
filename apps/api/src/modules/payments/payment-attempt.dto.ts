import { IsString, IsUUID, Matches } from 'class-validator';
export class CreatePaymentAttemptDto {
  @IsUUID('4') intentId!: string;
  @IsString() @Matches(/^\d{1,10}(\.\d{1,2})?$/) amount!: string;
}
