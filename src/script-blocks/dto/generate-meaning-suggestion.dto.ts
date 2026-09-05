import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GenerateMeaningSuggestionDto {
  @IsUUID('4', { message: 'Sản phẩm không hợp lệ' })
  productId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Tiêu đề tham khảo tối đa 200 ký tự' })
  existingTitle?: string;
}
