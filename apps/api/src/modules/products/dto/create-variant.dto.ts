import {
    IsString,
    IsNumber,
    IsInt,
    IsBoolean,
    IsOptional,
    IsObject,
    Min,
} from 'class-validator';

export class CreateVariantDto {
    @IsString()
    @IsOptional()
    sku?: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsInt()
    @Min(0)
    stock: number;

    @IsInt()
    @IsOptional()
    @Min(0)
    min_stock?: number;

    @IsObject()
    attributes: Record<string, string>; // e.g., { "size": "Large", "flavor": "Chocolate" }

    @IsBoolean()
    @IsOptional()
    active?: boolean;
}
