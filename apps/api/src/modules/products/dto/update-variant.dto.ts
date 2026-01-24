import {
    IsString,
    IsNumber,
    IsInt,
    IsBoolean,
    IsOptional,
    IsObject,
    Min,
} from 'class-validator';

export class UpdateVariantDto {
    @IsString()
    @IsOptional()
    sku?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    price?: number;

    @IsInt()
    @IsOptional()
    @Min(0)
    stock?: number;

    @IsInt()
    @IsOptional()
    @Min(0)
    min_stock?: number;

    @IsObject()
    @IsOptional()
    attributes?: Record<string, string>;

    @IsBoolean()
    @IsOptional()
    active?: boolean;
}
