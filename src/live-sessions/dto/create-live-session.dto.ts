import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SessionSlotDto } from './session-slot.dto';

export class CreateLiveSessionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Tên phiên không được để trống' })
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Thêm ít nhất 1 bước trong kịch bản' })
  @ValidateNested({ each: true })
  @Type(() => SessionSlotDto)
  slots!: SessionSlotDto[];
}
