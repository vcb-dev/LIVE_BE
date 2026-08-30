import { SegmentKind } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Min, ValidateIf } from 'class-validator';

export const CREATE_SLOT_KINDS = [
  SegmentKind.OPENING,
  SegmentKind.PRODUCT,
  SegmentKind.CTA,
  SegmentKind.GAME,
  SegmentKind.CLOSING,
] as const;

export class SessionSlotDto {
  @IsIn(CREATE_SLOT_KINDS, { message: 'Loại bước không hợp lệ' })
  kind!: (typeof CREATE_SLOT_KINDS)[number];

  @ValidateIf((slot: SessionSlotDto) => slot.kind === SegmentKind.PRODUCT)
  @IsUUID('4', { message: 'Sản phẩm không hợp lệ' })
  productId?: string;

  @ValidateIf((slot: SessionSlotDto) => slot.kind === SegmentKind.CTA)
  @IsOptional()
  @IsUUID('4', { message: 'Nhóm CTA không hợp lệ' })
  groupId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(10, { message: 'Thời lượng phải >= 10 giây' })
  plannedSec!: number;
}
