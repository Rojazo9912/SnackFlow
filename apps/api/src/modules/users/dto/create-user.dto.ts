import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsEnum, IsOptional, Length } from 'class-validator';
import { Role } from '../../../common/decorators/roles.decorator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email invalido' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @ApiProperty({ enum: Role, example: Role.SELLER })
  @IsEnum(Role, { message: 'Rol invalido' })
  role: Role;

  @ApiPropertyOptional({ example: '1234' })
  @IsString()
  @IsOptional()
  @Length(4, 6, { message: 'El PIN debe tener entre 4 y 6 digitos' })
  pin?: string;
}
