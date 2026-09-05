import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByHash(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        revokedAt: true,
        expiresAt: true,
        user: true,
      },
    });
  }

  revokeById(id: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  revokeByHash(tokenHash: string) {
    return this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  create(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return this.prisma.refreshToken.create({ data });
  }

  cleanupForUser(userId: string) {
    return this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });
  }
}
