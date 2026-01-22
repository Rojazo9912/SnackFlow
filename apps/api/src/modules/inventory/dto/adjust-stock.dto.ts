import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsString, IsEnum, Min, MinLength } from 'class-validator';

export class AdjustStockDto {
  @ApiProperty()
  @IsUUID('4')
  productId: string;

  @ApiProperty({ enum: ['in', 'out', 'waste'] })
  @IsEnum(['in', 'out', 'waste'], { message: 'Tipo invalido' })
  type: 'in' | 'out' | 'waste';

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  @ApiProperty({ example: 'Compra de mercancia' })
  @IsString()
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  reason: string;
}
