import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateLiveLookupDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Tên không được để trống' })
  @MaxLength(100, { message: 'Tên tối đa 100 ký tự' })
  name!: string;
}
