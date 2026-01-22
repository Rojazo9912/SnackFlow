import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class OpenCashDto {
  @ApiProperty({ example: 500, description: 'Monto inicial en efectivo' })
  @IsNumber()
  @Min(0, { message: 'El monto inicial debe ser mayor o igual a 0' })
  openingAmount: number;
}
