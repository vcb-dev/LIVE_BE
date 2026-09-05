import { BlockType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBlockGroupDto {
  @IsEnum(BlockType, { message: 'Loại block không hợp lệ' })
  type!: BlockType;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Mã nhóm không được để trống' })
  @MaxLength(50, { message: 'Mã nhóm tối đa 50 ký tự' })
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Mã nhóm chỉ gồm chữ in hoa, số và dấu gạch dưới',
  })
  code!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Tên nhóm không được để trống' })
  @MaxLength(100, { message: 'Tên nhóm tối đa 100 ký tự' })
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Trọng số phải >= 1' })
  weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Thứ tự sắp xếp phải >= 0' })
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Số lượng chọn phải >= 0' })
  pickCount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
