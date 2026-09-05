import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles, STAFF_ROLES } from '../auth/decorators';
import { EMOTION_IMAGE_MAX_BYTES } from './emotion-image.constants';
import { CreateEmotionDto } from './dto/create-emotion.dto';
import { ListEmotionsQueryDto } from './dto/list-emotions-query.dto';
import { UpdateEmotionDto } from './dto/update-emotion.dto';
import { EmotionsService } from './emotions.service';
import type { EmotionResponse } from './mappers/emotion.mapper';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

/** CRUD biểu cảm — chỉ LEADER và ADMIN. */
@Controller('emotions')
@Roles(...STAFF_ROLES)
export class EmotionsController {
  constructor(private readonly emotionsService: EmotionsService) {}

  @Get()
  findAll(@Query() query: ListEmotionsQueryDto): Promise<PaginatedResponse<EmotionResponse>> {
    return this.emotionsService.findAll(query);
  }

  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: EMOTION_IMAGE_MAX_BYTES },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.emotionsService.uploadImage(file);
  }

  @Post()
  create(@Body() dto: CreateEmotionDto): Promise<EmotionResponse> {
    return this.emotionsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EmotionResponse> {
    return this.emotionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmotionDto,
  ): Promise<EmotionResponse> {
    return this.emotionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.emotionsService.remove(id);
  }
}
