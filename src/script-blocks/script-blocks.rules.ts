import { BadRequestException } from '@nestjs/common';
import { BlockType } from '@prisma/client';

const PRODUCT_REQUIRED_TYPES: BlockType[] = [BlockType.STORY, BlockType.MEANING];
const GROUP_REQUIRED_TYPES: BlockType[] = [BlockType.CTA];

export function validateScriptBlockScope(
  type: BlockType,
  productId?: string | null,
  groupId?: string | null,
  categoryId?: string | null,
): void {
  if (categoryId) {
    throw new BadRequestException('Danh mục chưa được hỗ trợ');
  }

  if (PRODUCT_REQUIRED_TYPES.includes(type)) {
    if (!productId) {
      throw new BadRequestException('Câu chuyện và ý nghĩa phải gắn với sản phẩm');
    }
    if (groupId) {
      throw new BadRequestException('Loại này không được gắn nhóm block');
    }
    return;
  }

  if (GROUP_REQUIRED_TYPES.includes(type)) {
    if (!groupId) {
      throw new BadRequestException('CTA phải gắn với nhóm block');
    }
    if (productId) {
      throw new BadRequestException('CTA không được gắn sản phẩm');
    }
    return;
  }

  if (groupId) {
    throw new BadRequestException('Loại này không được gắn nhóm block');
  }
}
