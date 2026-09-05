import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateProductVariantDto } from './create-product-variant.dto';

export class CreateProductDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Mã sản phẩm không được để trống' })
  @MaxLength(100, { message: 'Mã sản phẩm tối đa 100 ký tự' })
  code!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Tên sản phẩm không được để trống' })
  @MaxLength(200, { message: 'Tên sản phẩm tối đa 200 ký tự' })
  name!: string;

  @IsOptional()
  @IsUUID('4', { message: 'Danh mục không hợp lệ' })
  categoryId?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Mô tả tối đa 5000 ký tự' })
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsUrl({}, { message: 'URL video không hợp lệ' })
  videoUrl?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Sapo ID tối đa 100 ký tự' })
  sapoId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsUrl({}, { message: 'Sapo URL không hợp lệ' })
  sapoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];
}
