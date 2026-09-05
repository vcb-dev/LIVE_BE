import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateEmotionDto } from './create-emotion.dto';

/** code không đổi sau khi tạo — chỉ cập nhật name và imageUrl. */
export class UpdateEmotionDto extends PartialType(
  OmitType(CreateEmotionDto, ['code'] as const),
) {}
