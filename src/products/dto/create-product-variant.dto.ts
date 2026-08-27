import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductVariantDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'SKU không được để trống' })
  @MaxLength(100, { message: 'SKU tối đa 100 ký tự' })
  sku!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Tên biến thể tối đa 100 ký tự' })
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Giá không hợp lệ' })
  @Min(0, { message: 'Giá phải >= 0' })
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Tồn kho phải >= 0' })
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
