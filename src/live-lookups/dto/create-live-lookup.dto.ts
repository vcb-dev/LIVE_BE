import { LiveLookupKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateLiveLookupDto {
  @IsEnum(LiveLookupKind, { message: 'Loại danh mục không hợp lệ' })
  kind!: LiveLookupKind;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Tên không được để trống' })
  @MaxLength(100, { message: 'Tên tối đa 100 ký tự' })
  name!: string;
}
