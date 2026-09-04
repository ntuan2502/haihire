import {
  Controller,
  Sse,
  Query,
  Req,
  UnauthorizedException,
  type MessageEvent,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Observable } from "rxjs";
import { EventsService } from "./events.service";
import type { Request } from "express";

@Controller("events")
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly jwtService: JwtService,
  ) {}

  @Sse("sse")
  sse(
    @Query("token") queryToken?: string,
    @Req() req?: Request,
  ): Observable<MessageEvent> {
    const token =
      queryToken ||
      req?.cookies?.["ats_token"] ||
      (req?.headers?.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined);

    if (!token) {
      throw new UnauthorizedException(
        "Authentication token required for SSE stream",
      );
    }

    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.id;
      return this.eventsService.subscribe(userId);
    } catch {
      throw new UnauthorizedException("Invalid or expired token for SSE stream");
    }
  }
}
