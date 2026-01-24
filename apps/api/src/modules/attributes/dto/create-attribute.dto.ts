import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateAttributeDto {
    @IsString()
    name: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    display_order?: number;
}
