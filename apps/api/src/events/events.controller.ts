import {
  Controller,
  Sse,
  Query,
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

    return this.eventsService.subscribeWithToken(token);
  }
}
