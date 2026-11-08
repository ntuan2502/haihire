import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { type AppErrorCode } from "@haihire/shared";

export class AppException extends HttpException {
  constructor(
    public readonly code: AppErrorCode,
    public readonly defaultMessage: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly params?: Record<string, string | number>,
  ) {
    super(
      {
        statusCode: status,
        code,
        message: defaultMessage,
        params,
      },
      status,
    );
  }
}

export class AppConflictException extends ConflictException {
  constructor(
    public readonly code: AppErrorCode,
    defaultMessage: string,
    public readonly params?: Record<string, string | number>,
  ) {
    super({
      statusCode: HttpStatus.CONFLICT,
      code,
      message: defaultMessage,
      params,
    });
  }
}

export class AppNotFoundException extends NotFoundException {
  constructor(
    public readonly code: AppErrorCode,
    defaultMessage: string,
    public readonly params?: Record<string, string | number>,
  ) {
    super({
      statusCode: HttpStatus.NOT_FOUND,
      code,
      message: defaultMessage,
      params,
    });
  }
}

export class AppBadRequestException extends BadRequestException {
  constructor(
    public readonly code: AppErrorCode,
    defaultMessage: string,
    public readonly params?: Record<string, string | number>,
  ) {
    super({
      statusCode: HttpStatus.BAD_REQUEST,
      code,
      message: defaultMessage,
      params,
    });
  }
}

export class AppForbiddenException extends ForbiddenException {
  constructor(
    public readonly code: AppErrorCode,
    defaultMessage: string,
    public readonly params?: Record<string, string | number>,
  ) {
    super({
      statusCode: HttpStatus.FORBIDDEN,
      code,
      message: defaultMessage,
      params,
    });
  }
}

export class AppUnauthorizedException extends UnauthorizedException {
  constructor(
    public readonly code: AppErrorCode,
    defaultMessage: string,
    public readonly params?: Record<string, string | number>,
  ) {
    super({
      statusCode: HttpStatus.UNAUTHORIZED,
      code,
      message: defaultMessage,
      params,
    });
  }
}
