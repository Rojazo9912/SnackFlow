import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ClockOutDto {
  @ApiPropertyOptional({ example: 'Turno sin novedad' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
