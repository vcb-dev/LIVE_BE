import { IsOptional, Matches } from 'class-validator';

export class DailyRankingsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Từ ngày phải là yyyy-MM-dd' })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Đến ngày phải là yyyy-MM-dd' })
  to?: string;
}
