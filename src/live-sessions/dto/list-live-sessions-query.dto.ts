import { SessionStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListLiveSessionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SessionStatus, { message: 'Trạng thái không hợp lệ' })
  status?: SessionStatus;
}
