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
import { BlockGroupsService } from './block-groups.service';
import { CreateBlockGroupDto } from './dto/create-block-group.dto';
import { ListBlockGroupsQueryDto } from './dto/list-block-groups-query.dto';
import { UpdateBlockGroupDto } from './dto/update-block-group.dto';
import type { BlockGroupResponse } from './mappers/block-group.mapper';

/** CRUD nhóm block — chỉ LEADER và ADMIN. */
@Controller('block-groups')
@Roles(...STAFF_ROLES)
export class BlockGroupsController {
  constructor(private readonly blockGroupsService: BlockGroupsService) {}

  @Get()
  findAll(
    @Query() query: ListBlockGroupsQueryDto,
  ): Promise<PaginatedResponse<BlockGroupResponse>> {
    return this.blockGroupsService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateBlockGroupDto): Promise<BlockGroupResponse> {
    return this.blockGroupsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BlockGroupResponse> {
    return this.blockGroupsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlockGroupDto,
  ): Promise<BlockGroupResponse> {
    return this.blockGroupsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.blockGroupsService.remove(id);
  }
}
