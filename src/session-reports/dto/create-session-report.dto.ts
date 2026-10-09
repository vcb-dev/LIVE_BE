import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSessionReportDto {
  @IsUUID()
  sessionId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày live phải là yyyy-MM-dd' })
  liveDate!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Nhập tên nhân sự' })
  @MaxLength(100, { message: 'Tên nhân sự tối đa 100 ký tự' })
  staffName!: string;

  @IsUUID('4', { message: 'Chọn ca live' })
  shiftId!: string;

  @IsUUID('4', { message: 'Chọn phân loại live' })
  liveTypeId!: string;

  @IsUUID('4', { message: 'Chọn team' })
  teamId!: string;

  @IsUUID('4', { message: 'Chọn kênh live' })
  channelId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tổng giờ live không hợp lệ' })
  @Min(0, { message: 'Tổng giờ live phải >= 0' })
  totalHours!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Doanh thu không hợp lệ' })
  @Min(0, { message: 'Doanh thu phải >= 0' })
  revenue!: number;

  @Type(() => Number)
  @IsInt({ message: 'Số view phải là số nguyên' })
  @Min(0)
  viewCount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tỷ lệ giữ chân không hợp lệ' })
  @Min(0)
  @Max(100, { message: 'Tỷ lệ giữ chân tối đa 100' })
  retentionRate!: number;

  @Type(() => Number)
  @IsInt({ message: 'Tổng đơn phải là số nguyên' })
  @Min(0)
  orderCount!: number;

  @Type(() => Number)
  @IsInt({ message: 'Lượt hiển thị phải là số nguyên' })
  @Min(0)
  impressionCount!: number;
}
