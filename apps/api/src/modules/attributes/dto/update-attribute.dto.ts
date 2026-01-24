import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateAttributeDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    display_order?: number;
}
