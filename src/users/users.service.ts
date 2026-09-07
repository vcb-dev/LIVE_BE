import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hash } from 'node_modules/bcryptjs/umd';
import { RefreshTokenRepository } from 'src/auth/refresh-token.repository';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { buildPaginatedMeta } from 'src/common/pagination/paginate';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { mapUserToResponse, UserResponse, userSelect } from './mappers/user.mapper';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async findAll(query: ListUsersQueryDto): Promise<PaginatedResponse<UserResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: rows.map(mapUserToResponse),
      meta: buildPaginatedMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return mapUserToResponse(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const passwordHash = await hash(dto.password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: dto.role,
          isActive: dto.isActive ?? true,
        },
        select: userSelect,
      });
      return mapUserToResponse(user);
    } catch (error) {
      this.rethrowPrismaError(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto, actorId: string): Promise<UserResponse> {
    await this.ensureExists(id);
    if (id === actorId && dto.isActive === false) {
      throw new BadRequestException('Không thể tự vô hiệu hóa tài khoản của mình');
    }
    const data: Prisma.UserUpdateInput = {};
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) {
      data.passwordHash = await hash(dto.password, 12);
    }
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
        select: userSelect,
      });
      // Thu hồi session khi đổi mật khẩu hoặc vô hiệu hóa
      if (dto.password || dto.isActive === false) {
        await this.refreshTokens.cleanupForUser(id);
      }
      return mapUserToResponse(user);
    } catch (error) {
      this.rethrowPrismaError(error);
      throw error;
    }
  }

  async remove(id: string, actorId: string): Promise<void> {
    if (id === actorId) {
      throw new BadRequestException('Không thể vô hiệu hóa tài khoản của mình');
    }
    await this.update(id, { isActive: false }, actorId);
  }

  private buildWhere(query: ListUsersQueryDto): Prisma.UserWhereInput {
    const filters: Prisma.UserWhereInput[] = [];

    if (query.q) {
      filters.push({ email: { contains: query.q, mode: 'insensitive' } });
    }
    if (query.role) {
      filters.push({ role: query.role });
    }
    if (query.isActive !== undefined) {
      filters.push({ isActive: query.isActive });
    }
    if (filters.length === 0) return {};
    if (filters.length === 1) return filters[0]!;
    return { AND: filters };
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Không tìm thấy người dùng');
  }

  private rethrowPrismaError(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Email đã được sử dụng');
    }
  }
}
