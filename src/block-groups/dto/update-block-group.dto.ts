import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateBlockGroupDto } from './create-block-group.dto';

/** type và code không đổi sau khi tạo. */
export class UpdateBlockGroupDto extends PartialType(
  OmitType(CreateBlockGroupDto, ['type', 'code'] as const),
) {}
