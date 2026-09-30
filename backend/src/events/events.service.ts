import { Injectable, Inject, Optional, type MessageEvent } from "@nestjs/common";
import { Subject, Observable, merge, interval, of } from "rxjs";
import { filter, map } from "rxjs/operators";
import { JwtService } from "@nestjs/jwt";
import { AppUnauthorizedException } from "../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";

export interface AppEvent {
  type: "MEMBER_REMOVED" | "MEMBER_ROLE_UPDATED" | "ORG_UPDATED" | "CONNECTED" | "HEARTBEAT";
  targetUserId?: string;
  organizationId?: string | null;
  role?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class EventsService {
  private readonly events$ = new Subject<AppEvent>();

  constructor(
    @Optional()
    @Inject(JwtService)
    private readonly jwtService?: JwtService,
  ) {}

  emit(event: AppEvent) {
    this.events$.next(event);
  }

  subscribeWithToken(token?: string): Observable<MessageEvent> {
    if (!token) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.SSE_UNAUTHORIZED,
        "Authentication token required for SSE stream",
      );
    }

    try {
      if (!this.jwtService) {
        throw new Error("JwtService not available");
      }
      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.id;
      return this.subscribe(userId);
    } catch (err) {
      if (err instanceof AppUnauthorizedException) {
        throw err;
      }
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.SSE_UNAUTHORIZED,
        "Invalid or expired token for SSE stream",
      );
    }
  }

  subscribe(userId: string): Observable<MessageEvent> {
    const userEvents$ = this.events$.asObservable().pipe(
      filter((event) => {
        // Targeted specifically to this user
        if (event.targetUserId && event.targetUserId === userId) {
          return true;
        }
        // Targeted to an organization (broadcast to all listeners for org-wide cache invalidation)
        if (event.organizationId) {
          return true;
        }
        return false;
      }),
      map(
        (event) =>
          ({
            data: event,
          }) as MessageEvent,
      ),
    );

    const initial$ = of({
      data: { type: "CONNECTED" },
    } as MessageEvent);

    const heartbeat$ = interval(15000).pipe(
      map(
        () =>
          ({
            data: { type: "HEARTBEAT" },
          }) as MessageEvent,
      ),
    );

    return merge(initial$, heartbeat$, userEvents$);
  }
}
