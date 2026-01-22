import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, Min } from 'class-validator';

export class ProductIngredientDto {
  @ApiProperty({ example: 'uuid-del-ingrediente' })
  @IsUUID('4')
  ingredientId: string;

  @ApiProperty({ example: 1, description: 'Cantidad del ingrediente a usar' })
  @IsNumber()
  @Min(0.0001, { message: 'La cantidad debe ser mayor a 0' })
  quantity: number;
}
