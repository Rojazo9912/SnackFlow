import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class UpdatePinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(4, 6, { message: 'El PIN debe tener entre 4 y 6 digitos' })
  pin: string;
}
