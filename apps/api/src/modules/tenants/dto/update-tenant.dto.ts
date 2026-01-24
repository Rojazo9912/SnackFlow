import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Mi Dulceria' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'mi-dulceria' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: { logo: 'url', phone: '123' } })
  @IsOptional()
  settings?: Record<string, any>;
}
