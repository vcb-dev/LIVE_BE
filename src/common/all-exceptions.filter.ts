import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import type { Response } from 'express';

import { isTechnicalError, toUserFacingError } from './user-facing-error.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      const body = exception.getResponse();

      let message = this.extractMessage(body);

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR || isTechnicalError(message)) {
        message = toUserFacingError(message);
      }

      response.status(status).json({
        statusCode: status,

        message,

        error: status === HttpStatus.BAD_REQUEST ? 'Bad Request' : exception.name,
      });

      return;
    }

    const raw = exception instanceof Error ? exception.message : String(exception);

    this.logger.error(raw, exception instanceof Error ? exception.stack : undefined);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,

      message: toUserFacingError(raw),

      error: 'Internal Server Error',
    });
  }

  private extractMessage(body: string | object): string {
    if (typeof body === 'string') return body;

    if (body && typeof body === 'object') {
      const msg = (body as { message?: string | string[] }).message;

      if (Array.isArray(msg)) return msg.join(', ');

      if (typeof msg === 'string') return msg;
    }

    return 'Đã có lỗi xảy ra';
  }
}
