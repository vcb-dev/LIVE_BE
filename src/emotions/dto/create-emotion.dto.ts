import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateEmotionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Mã biểu cảm không được để trống' })
  @MaxLength(50, { message: 'Mã biểu cảm tối đa 50 ký tự' })
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Mã biểu cảm chỉ gồm chữ in hoa, số và dấu gạch dưới',
  })
  code!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Tên biểu cảm không được để trống' })
  @MaxLength(100, { message: 'Tên biểu cảm tối đa 100 ký tự' })
  name!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsUrl({}, { message: 'URL ảnh không hợp lệ' })
  imageUrl?: string;
}
