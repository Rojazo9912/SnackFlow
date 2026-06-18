import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class DenominationDto {
  @ApiProperty({ example: 500, description: 'Valor de la denominación (MXN)' })
  @IsNumber()
  @Min(0)
  denomination: number;

  @ApiProperty({ example: 3, description: 'Cantidad de billetes/monedas contados' })
  @IsNumber()
  @Min(0)
  quantity: number;
}

export class BlindCountDto {
  @ApiProperty({ type: [DenominationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DenominationDto)
  denominations: DenominationDto[];
}

export class CloseBlindDto {
  @ApiPropertyOptional({ example: 'Faltante por cambio de turno' })
  @IsOptional()
  @IsString()
  closeNotes?: string;

  @ApiPropertyOptional({ example: '1234', description: 'PIN de supervisor (obligatorio si descuadre > $50)' })
  @IsOptional()
  @IsString()
  supervisorPin?: string;
}
