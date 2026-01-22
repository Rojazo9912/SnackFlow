import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../orders.service';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus, { message: 'Estado invalido' })
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'Cliente no quiso esperar' })
  @IsString()
  @IsOptional()
  reason?: string;
}
