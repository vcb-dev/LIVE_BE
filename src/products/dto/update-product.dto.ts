import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

/** Mã sản phẩm không đổi sau khi tạo. */
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['code'] as const),
) {}
