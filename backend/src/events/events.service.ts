import { Injectable, type MessageEvent } from "@nestjs/common";
import { Subject, Observable, merge, interval, of } from "rxjs";
import { filter, map } from "rxjs/operators";

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

  emit(event: AppEvent) {
    this.events$.next(event);
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
