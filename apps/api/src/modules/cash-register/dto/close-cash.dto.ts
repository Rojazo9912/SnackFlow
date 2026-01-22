import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class CloseCashDto {
  @ApiProperty({ example: 1500, description: 'Monto final contado en efectivo' })
  @IsNumber()
  @Min(0, { message: 'El monto debe ser mayor o igual a 0' })
  closingAmount: number;
}
