import { BlockType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListScriptBlocksQueryDto extends PaginationQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsEnum(BlockType, { message: 'Loại block không hợp lệ' })
  type?: BlockType;

  @IsOptional()
  @IsUUID('4')
  groupId?: string;

  @IsOptional()
  @IsUUID('4')
  productId?: string;

  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
