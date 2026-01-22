import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Length } from 'class-validator';

export class ValidatePinDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4', { message: 'ID de usuario invalido' })
  userId: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(4, 6, { message: 'El PIN debe tener entre 4 y 6 digitos' })
  pin: string;
}
