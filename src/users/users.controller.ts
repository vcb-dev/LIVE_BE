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
import { CurrentUser, Roles } from '../auth/decorators';
import { ADMIN_ONLY_ROLES } from '../auth/role-groups';
import type { JwtPayloadUser } from '../auth/types';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { UserResponse } from './mappers/user.mapper';
import { UsersService } from './users.service';

/** CRUD người dùng — chỉ ADMIN. */
@Controller('users')
@Roles(...ADMIN_ONLY_ROLES)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: ListUsersQueryDto): Promise<PaginatedResponse<UserResponse>> {
    return this.usersService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateUserDto): Promise<UserResponse> {
    return this.usersService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponse> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: JwtPayloadUser,
  ): Promise<UserResponse> {
    return this.usersService.update(id, dto, actor.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayloadUser,
  ): Promise<void> {
    return this.usersService.remove(id, actor.id);
  }
}
