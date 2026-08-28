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
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { CreateScriptBlockDto } from './dto/create-script-block.dto';
import { ListScriptBlocksQueryDto } from './dto/list-script-blocks-query.dto';
import { UpdateScriptBlockDto } from './dto/update-script-block.dto';
import type { ScriptBlockResponse } from './mappers/script-block.mapper';
import { ScriptBlocksService } from './script-blocks.service';

/** CRUD kho nội dung kịch bản — chỉ LEADER và ADMIN. */
@Controller('script-blocks')
@Roles(...STAFF_ROLES)
export class ScriptBlocksController {
  constructor(private readonly scriptBlocksService: ScriptBlocksService) {}

  @Get()
  findAll(
    @Query() query: ListScriptBlocksQueryDto,
  ): Promise<PaginatedResponse<ScriptBlockResponse>> {
    return this.scriptBlocksService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateScriptBlockDto): Promise<ScriptBlockResponse> {
    return this.scriptBlocksService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ScriptBlockResponse> {
    return this.scriptBlocksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScriptBlockDto,
  ): Promise<ScriptBlockResponse> {
    return this.scriptBlocksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.scriptBlocksService.remove(id);
  }
}
