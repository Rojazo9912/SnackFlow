import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class ReorderCategoriesDto {
  @ApiProperty({
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    description: 'Array de IDs de categorias en el nuevo orden',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds: string[];
}
