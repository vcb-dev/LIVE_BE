import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { compare } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenRepository } from './refresh-token.repository';
import type { AuthUser } from './types';

export type { AuthUser } from './types';

type UserAuthRow = Pick<User, 'id' | 'email' | 'role' | 'isActive' | 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    if (!dto.email) {
      throw new UnauthorizedException('Email không được để trống');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const valid = await compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    return this.issueTokens(user);
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokens.findByHash(tokenHash);

    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const [, tokens] = await Promise.all([
      this.refreshTokens.revokeById(stored.id),
      this.issueTokens(stored.user),
    ]);

    return tokens;
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.refreshTokens.revokeByHash(this.hashToken(refreshToken));
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    }
    return this.toAuthUser(user);
  }

  private async issueTokens(
    user: UserAuthRow,
  ): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    const authUser = this.toAuthUser(user);
    const accessExpires = this.config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m';
    const refreshToken = randomBytes(48).toString('hex');
    const refreshDays = this.parseDays(this.config.get<string>('JWT_REFRESH_EXPIRES') ?? '7d');

    const [accessToken] = await Promise.all([
      this.jwt.signAsync(
        {
          sub: authUser.id,
          email: authUser.email,
          role: authUser.role,
        },
        {
          secret: this.config.get<string>('JWT_SECRET'),
          expiresIn: accessExpires as `${number}m` | `${number}d` | `${number}h`,
        },
      ),
      this.refreshTokens.create({
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
      }),
    ]);

    void this.refreshTokens.cleanupForUser(user.id).catch(() => undefined);

    return { accessToken, refreshToken, user: authUser };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDays(value: string): number {
    const match = /^(\d+)d$/i.exec(value.trim());
    return match ? Number(match[1]) : 7;
  }

  private toAuthUser(user: Pick<User, 'id' | 'email' | 'role'>): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
