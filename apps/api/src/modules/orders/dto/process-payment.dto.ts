import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentMethodDto {
  @IsString()
  method: string; // 'cash', 'card', 'transfer'

  @IsNumber()
  @Min(0)
  amount: number;
}

export class ProcessPaymentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodDto)
  payments: PaymentMethodDto[];

  @IsOptional()
  @IsNumber()
  amountReceived?: number; // For cash change calculation

  @IsOptional()
  @IsNumber()
  change?: number;

  @IsOptional()
  @IsString()
  paymentDetails?: string;
}
