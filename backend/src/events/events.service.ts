import {
  Injectable,
  Inject,
  Optional,
  Logger,
  type MessageEvent,
  type OnModuleInit,
  type OnModuleDestroy,
} from "@nestjs/common";
import { Subject, Observable, merge, interval, of, from } from "rxjs";
import { filter, map, switchMap } from "rxjs/operators";
import { JwtService } from "@nestjs/jwt";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.module";
import { PrismaService } from "../prisma/prisma.service";
import { AppUnauthorizedException } from "../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";

export const EVENTS_PUBSUB_CHANNEL = "haihire:events";

export interface AppEvent {
  type:
    | "MEMBER_REMOVED"
    | "MEMBER_ROLE_UPDATED"
    | "ORG_UPDATED"
    | "CONNECTED"
    | "HEARTBEAT";
  targetUserId?: string;
  organizationId?: string | null;
  role?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private readonly events$ = new Subject<AppEvent>();
  private subscriberClient?: Redis;

  constructor(
    @Optional()
    @Inject(JwtService)
    private readonly jwtService?: JwtService,
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redisClient?: Redis,
  ) {}

  async onModuleInit() {
    if (this.redisClient) {
      try {
        this.subscriberClient = this.redisClient.duplicate();
        await this.subscriberClient.connect().catch(() => {});
        await this.subscriberClient
          .subscribe(EVENTS_PUBSUB_CHANNEL)
          .catch(() => {});

        this.subscriberClient.on(
          "message",
          (channel: string, message: string) => {
            if (channel === EVENTS_PUBSUB_CHANNEL) {
              try {
                const event = JSON.parse(message) as AppEvent;
                this.events$.next(event);
              } catch (err) {
                this.logger.warn(`Failed to deserialize pub/sub event: ${err}`);
              }
            }
          },
        );
      } catch (err) {
        this.logger.warn(
          `Failed to initialize Valkey pub/sub subscriber: ${err}`,
        );
      }
    }
  }

  async onModuleDestroy() {
    if (this.subscriberClient) {
      try {
        await this.subscriberClient
          .unsubscribe(EVENTS_PUBSUB_CHANNEL)
          .catch(() => {});
        await this.subscriberClient.quit().catch(() => {});
      } catch {
        this.subscriberClient.disconnect();
      }
    }
  }

  emit(event: AppEvent) {
    if (this.redisClient) {
      this.redisClient
        .publish(EVENTS_PUBSUB_CHANNEL, JSON.stringify(event))
        .catch((err) => {
          this.logger.warn(
            `Failed to publish event to Valkey, falling back to local: ${err}`,
          );
          this.events$.next(event);
        });
      return;
    }
    this.events$.next(event);
  }

  async resolveUserOrgIds(
    userId: string,
    tokenOrgId?: string | null,
  ): Promise<Set<string>> {
    const orgIds = new Set<string>();
    if (tokenOrgId) {
      orgIds.add(tokenOrgId);
    }
    if (this.prisma) {
      try {
        const user = await this.prisma.db.orm.public.User.select(
          "organizationId",
        )
          .where((u) => u.id.eq(userId))
          .first();
        if (user?.organizationId) {
          orgIds.add(user.organizationId);
        }
        const memberships =
          await this.prisma.db.orm.public.OrganizationMember.select(
            "organizationId",
          )
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

  subscribe(
    userId: string,
    allowedOrgIds?: Set<string> | string[],
  ): Observable<MessageEvent> {
    const orgSet =
      allowedOrgIds instanceof Set
        ? allowedOrgIds
        : new Set(allowedOrgIds || []);

    const userEvents$ = this.events$.asObservable().pipe(
      filter((event) => {
        const isTargetedToUser = Boolean(
          event.targetUserId && event.targetUserId === userId,
        );
        const isTargetedToOrg = Boolean(
          event.organizationId && orgSet.has(event.organizationId),
        );

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
