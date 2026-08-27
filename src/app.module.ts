import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CsrfGuard } from './auth/guards/csrf.guard';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { EmotionsModule } from './emotions/emotions.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // ConfigModule để đọc các biến môi trường từ file .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    ScheduleModule.forRoot(),
    // Ứng dụng sẽ bị tắt nếu vượt quá 200 request trong 1 phút
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 200,
      },
    ]),
    // CacheModule để lưu trữ dữ liệu trong bộ nhớ cache
    CacheModule.register({
      isGlobal: true,
      ttl: 5 * 1000, // 5 seconds
      max: 100,
    }),
    PrismaModule,
    AuthModule,
    CloudinaryModule,
    EmotionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // JWT → CSRF → Roles (@Roles on handlers that need role checks)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
