import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, Min, MinLength } from 'class-validator';
import { CashMovementType } from '../cash-register.service';

export class CashMovementDto {
  @ApiProperty({ enum: CashMovementType })
  @IsEnum(CashMovementType, { message: 'Tipo de movimiento invalido' })
  type: CashMovementType;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  amount: number;

  @ApiProperty({ example: 'Retiro para cambio' })
  @IsString()
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  reason: string;
}
