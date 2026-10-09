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
} from '@nestjs/common';
import { Roles, STAFF_ROLES } from '../auth/decorators';
import { CreateLiveLookupDto } from './dto/create-live-lookup.dto';
import { ListLiveLookupsQueryDto } from './dto/list-live-lookups-query.dto';
import { UpdateLiveLookupDto } from './dto/update-live-lookup.dto';
import { LiveLookupsService } from './live-lookups.service';

@Controller('live-lookups')
export class LiveLookupsController {
  constructor(private readonly liveLookupsService: LiveLookupsService) {}

  /** Mọi user đã đăng nhập đọc được — form báo cáo ca cần danh sách này. */
  @Get()
  findAll(@Query() query: ListLiveLookupsQueryDto) {
    return this.liveLookupsService.findAll(query);
  }

  @Post()
  @Roles(...STAFF_ROLES)
  create(@Body() dto: CreateLiveLookupDto) {
    return this.liveLookupsService.create(dto);
  }

  @Patch(':id')
  @Roles(...STAFF_ROLES)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLiveLookupDto) {
    return this.liveLookupsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...STAFF_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.liveLookupsService.remove(id);
  }
}
