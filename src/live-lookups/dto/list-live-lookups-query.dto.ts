import { LiveLookupKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListLiveLookupsQueryDto extends PaginationQueryDto {
  @IsEnum(LiveLookupKind, { message: 'Loại danh mục không hợp lệ' })
  kind!: LiveLookupKind;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
