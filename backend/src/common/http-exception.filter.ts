import {
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
  type ArgumentsHost,
} from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 1. Check for rate limit / throttler exception (including ESM/CJS hazard)
    const isThrottler =
      (exception as any)?.name === "ThrottlerException" ||
      exception?.constructor?.name === "ThrottlerException" ||
      (exception as any)?.status === HttpStatus.TOO_MANY_REQUESTS;

    if (isThrottler) {
      return response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please slow down and try again later.",
      });
    }

    // 2. Check for standard HttpException or duck-typed HttpException
    if (
      exception instanceof HttpException ||
      (typeof (exception as any)?.getStatus === "function" &&
        typeof (exception as any)?.getResponse === "function")
    ) {
      const status = (exception as any).getStatus();
      const res = (exception as any).getResponse();
      const body =
        typeof res === "string"
          ? { statusCode: status, message: res }
          : res;
      return response.status(status).json(body);
    }

    // 3. Unhandled exceptions
    console.error("Unhandled Exception in GlobalExceptionFilter:", exception);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    });
  }
}
