import {
  Injectable,
  Inject,
  Optional,
  Logger,
  type MessageEvent,
  type OnModuleInit,
  type OnModuleDestroy,
} from "@nestjs/common";
import { Subject, Observable, merge, interval, of, defer } from "rxjs";
import { concatMap, filter, map, switchMap } from "rxjs/operators";
import { JwtService } from "@nestjs/jwt";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.module";
import { PrismaService } from "../prisma/prisma.service";
import { AppUnauthorizedException } from "../common/app-exception";
import {
  APP_ERROR_CODES,
  type AppEvent,
  type AppEventType,
} from "@haihire/shared";

export type { AppEvent, AppEventType };

export const EVENTS_PUBSUB_CHANNEL = "haihire:events";

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

  async resolveUserOrgIds(userId: string): Promise<Set<string>> {
    if (!this.prisma) throw new Error("PrismaService not available");
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    return new Set(memberships.map((membership) => membership.organizationId));
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

    let payload: { sub?: string; type?: string; tokenVersion?: number };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.SSE_UNAUTHORIZED,
        "Invalid or expired token for SSE stream",
      );
    }

    const userId = payload.sub;
    if (!userId || (payload.type !== undefined && payload.type !== "access")) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.SSE_UNAUTHORIZED,
        "Invalid token payload for SSE stream",
      );
    }

    return defer(async () => {
      if (!this.prisma) throw new Error("PrismaService not available");
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, tokenVersion: true },
      });
      if (!user || (user.tokenVersion ?? 0) !== (payload.tokenVersion ?? 0)) {
        throw new AppUnauthorizedException(
          APP_ERROR_CODES.SSE_UNAUTHORIZED,
          "User session revoked",
        );
      }
      const initialOrgIds = await this.resolveUserOrgIds(userId);
      return { initialOrgIds };
    }).pipe(
      switchMap(({ initialOrgIds }) => {
        const userOrgIds = new Set(initialOrgIds);

        const initial$ = of<MessageEvent>({
          data: { type: "CONNECTED" },
        });

        const heartbeat$ = interval(15000).pipe(
          map((): MessageEvent => ({
            data: { type: "HEARTBEAT" },
          })),
        );

        const domainEvents$ = this.events$.pipe(
          filter((event) => {
            if (event.targetUserId) {
              return event.targetUserId === userId;
            }
            if (!event.organizationId) {
              return true;
            }
            return userOrgIds.has(event.organizationId);
          }),
          concatMap(async (event) => {
            try {
              const currentPayload =
                this.jwtService!.verify<typeof payload>(token);
              if (!this.prisma) throw new Error("PrismaService not available");
              const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, tokenVersion: true },
              });
              if (
                !user ||
                (user.tokenVersion ?? 0) !== (currentPayload.tokenVersion ?? 0)
              ) {
                throw new Error("User session revoked");
              }
              const currentOrgIds = await this.resolveUserOrgIds(userId);
              userOrgIds.clear();
              currentOrgIds.forEach((id) => userOrgIds.add(id));
              const allowed = event.targetUserId
                ? event.targetUserId === userId
                : !event.organizationId || userOrgIds.has(event.organizationId);
              return allowed ? ({ data: event } as MessageEvent) : null;
            } catch {
              throw new AppUnauthorizedException(
                APP_ERROR_CODES.SSE_UNAUTHORIZED,
                "SSE session is no longer authorized",
              );
            }
          }),
          filter((event): event is MessageEvent => event !== null),
        );

        return merge(initial$, heartbeat$, domainEvents$);
      }),
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
