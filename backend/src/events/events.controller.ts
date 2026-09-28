import {
  Controller,
  Sse,
  Query,
  Req,
  Inject,
  type MessageEvent,
} from "@nestjs/common";
import { AppUnauthorizedException } from "../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";
import { JwtService } from "@nestjs/jwt";
import { Observable } from "rxjs";
import { EventsService } from "./events.service";
import type { Request } from "express";

@Controller("events")
export class EventsController {
  constructor(
    @Inject(EventsService)
    private readonly eventsService: EventsService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  @Sse("sse")
  sse(
    @Query("token") queryToken?: string,
    @Req() req?: Request,
  ): Observable<MessageEvent> {
    const token =
      queryToken ||
      req?.cookies?.["haihire_token"] ||
      (req?.headers?.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined);

    if (!token) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.SSE_UNAUTHORIZED,
        "Authentication token required for SSE stream",
      );
    }

    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.id;
      return this.eventsService.subscribe(userId);
    } catch {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.SSE_UNAUTHORIZED,
        "Invalid or expired token for SSE stream",
      );
    }
  }
}
