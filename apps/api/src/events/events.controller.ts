import {
  Controller,
  Sse,
  Req,
  Inject,
  type MessageEvent,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { EventsService } from "./events.service";
import type { Request } from "express";

@Controller("events")
export class EventsController {
  constructor(
    @Inject(EventsService)
    private readonly eventsService: EventsService,
  ) {}

  @Sse("sse")
  sse(@Req() req?: Request): Observable<MessageEvent> {
    const token =
      req?.cookies?.["haihire_token"] ||
      (req?.headers?.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined);

    return this.eventsService.subscribeWithToken(token);
  }
}
