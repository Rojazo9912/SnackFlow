import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';

export class OrderItemDto {
  @ApiProperty()
  @IsUUID('4')
  productId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  @ApiPropertyOptional({ example: 'Sin chile' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'El pedido debe tener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ example: 'Mesa 5' })
  @IsString()
  @IsOptional()
  notes?: string;
}
