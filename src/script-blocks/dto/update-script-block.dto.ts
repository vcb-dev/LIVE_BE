import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateScriptBlockDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Tiêu đề tối đa 200 ký tự' })
  title?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Nội dung không được để trống' })
  @MaxLength(10000, { message: 'Nội dung tối đa 10000 ký tự' })
  content?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Thời lượng phải >= 1 giây' })
  durationSec?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Trọng số phải >= 1' })
  weight?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique(undefined, { message: 'Biểu cảm không được trùng nhau' })
  @IsUUID('4', { each: true, message: 'Biểu cảm không hợp lệ' })
  emotionIds?: string[];
}
