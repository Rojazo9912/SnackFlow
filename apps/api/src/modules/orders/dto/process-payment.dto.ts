import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, IsObject, Min } from 'class-validator';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  MIXED = 'mixed',
}

export class ProcessPaymentDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod, { message: 'Metodo de pago invalido' })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    example: { amountReceived: 100, change: 15 },
    description: 'Detalles adicionales del pago',
  })
  @IsObject()
  @IsOptional()
  paymentDetails?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  amountReceived?: number;
}
