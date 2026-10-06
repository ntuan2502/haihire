import { Injectable, Inject, Optional, type MessageEvent } from "@nestjs/common";
import { Subject, Observable, merge, interval, of, from } from "rxjs";
import { filter, map, switchMap } from "rxjs/operators";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
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
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
  ) {}

  emit(event: AppEvent) {
    this.events$.next(event);
  }

  async resolveUserOrgIds(userId: string, tokenOrgId?: string | null): Promise<Set<string>> {
    const orgIds = new Set<string>();
    if (tokenOrgId) {
      orgIds.add(tokenOrgId);
    }
    if (this.prisma) {
      try {
        const user = await this.prisma.db.orm.public.User.select("organizationId")
          .where((u) => u.id.eq(userId))
          .first();
        if (user?.organizationId) {
          orgIds.add(user.organizationId);
        }
        const memberships = await this.prisma.db.orm.public.OrganizationMember.select("organizationId")
          .where((m) => m.userId.eq(userId))
          .all();
        for (const m of memberships) {
          if (m.organizationId) {
            orgIds.add(m.organizationId);
          }
        }
      } catch {
        // Fall back to tokenOrgId if database query is unavailable
      }
    }
    return orgIds;
  }

  subscribeWithToken(token?: string): Observable<MessageEvent> {
    if (!token) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.SSE_UNAUTHORIZED,
        "Authentication token required for SSE stream",
      );
    }

    if (!this.jwtService) {
      throw new Error("JwtService not available");
    }

    let payload: { sub?: string; id?: string; organizationId?: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.SSE_UNAUTHORIZED,
        "Invalid or expired token for SSE stream",
      );
    }

    const userId = payload.sub || payload.id;
    if (!userId) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.SSE_UNAUTHORIZED,
        "Invalid token payload for SSE stream",
      );
    }

    return from(this.resolveUserOrgIds(userId, payload.organizationId)).pipe(
      switchMap((orgIds) => this.subscribe(userId, orgIds)),
    );
  }

  subscribe(userId: string, allowedOrgIds?: Set<string> | string[]): Observable<MessageEvent> {
    const orgSet = allowedOrgIds instanceof Set ? allowedOrgIds : new Set(allowedOrgIds || []);

    const userEvents$ = this.events$.asObservable().pipe(
      filter((event) => {
        const isTargetedToUser = Boolean(event.targetUserId && event.targetUserId === userId);
        const isTargetedToOrg = Boolean(event.organizationId && orgSet.has(event.organizationId));

        if (event.targetUserId || event.organizationId) {
          return isTargetedToUser || isTargetedToOrg;
        }
        // Global / system events with no tenant or user target
        return true;
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
