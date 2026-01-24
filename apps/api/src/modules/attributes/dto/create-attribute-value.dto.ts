import { IsString, IsUUID, IsInt, IsOptional, Min } from 'class-validator';

export class CreateAttributeValueDto {
    @IsUUID()
    attribute_id: string;

    @IsString()
    value: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    display_order?: number;
}
