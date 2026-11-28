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

const VALIDATION_CACHE_TTL_MS = 5000;
const MEMBERSHIP_INVALIDATION_EVENTS = new Set<string>([
  "MEMBER_REMOVED",
  "MEMBER_ROLE_UPDATED",
  "MEMBERS_CHANGED",
  "ORG_DELETED",
]);

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private readonly events$ = new Subject<AppEvent>();
  private subscriberClient?: Redis;
  private readonly validationCache = new Map<
    string,
    { expiresAt: number; tokenVersion: number; orgIds: Set<string> }
  >();
  private readonly inFlightValidations = new Map<
    string,
    Promise<{ tokenVersion: number; orgIds: Set<string> }>
  >();

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
                this.evictValidationCacheForEvent(event);
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

  private evictValidationCacheForEvent(event: AppEvent) {
    if (MEMBERSHIP_INVALIDATION_EVENTS.has(event.type)) {
      if (event.targetUserId) {
        for (const key of this.validationCache.keys()) {
          if (
            key === event.targetUserId ||
            key.startsWith(`${event.targetUserId}:`)
          ) {
            this.validationCache.delete(key);
          }
        }
      } else {
        this.validationCache.clear();
      }
    }
  }

  private async isUserSessionActive(
    userId: string,
    sid?: string,
  ): Promise<boolean> {
    if (
      !sid ||
      !this.prisma?.userSession ||
      typeof this.prisma.userSession.findFirst !== "function"
    ) {
      return true;
    }
    const activeSession = await this.prisma.userSession.findFirst({
      where: {
        id: sid,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    return Boolean(activeSession);
  }

  private async getValidatedUserState(
    userId: string,
    sid?: string,
  ): Promise<{ tokenVersion: number; orgIds: Set<string> }> {
    const cacheKey = sid ? `${userId}:${sid}` : userId;
    const cached = this.validationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { tokenVersion: cached.tokenVersion, orgIds: cached.orgIds };
    }

    const existingPromise = this.inFlightValidations.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    const validationPromise = (async () => {
      if (!this.prisma) throw new Error("PrismaService not available");
      const [user, sessionValid] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, tokenVersion: true },
        }),
        this.isUserSessionActive(userId, sid),
      ]);
      if (!user || !sessionValid) {
        throw new Error("User session revoked");
      }
      const orgIds = await this.resolveUserOrgIds(userId);
      const tokenVersion = user.tokenVersion ?? 0;
      this.validationCache.set(cacheKey, {
        expiresAt: Date.now() + VALIDATION_CACHE_TTL_MS,
        tokenVersion,
        orgIds,
      });
      return { tokenVersion, orgIds };
    })();

    this.inFlightValidations.set(cacheKey, validationPromise);
    try {
      return await validationPromise;
    } finally {
      this.inFlightValidations.delete(cacheKey);
    }
  }

  emit(event: AppEvent) {
    this.evictValidationCacheForEvent(event);
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

    let payload: {
      sub?: string;
      type?: string;
      tokenVersion?: number;
      sid?: string;
    };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.SSE_UNAUTHORIZED,
        "Invalid or expired token for SSE stream",
      );
    }

    const userId = payload.sub;
    const sid = payload.sid;
    if (!userId || (payload.type !== undefined && payload.type !== "access")) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.SSE_UNAUTHORIZED,
        "Invalid token payload for SSE stream",
      );
    }

    return defer(async () => {
      if (!this.prisma) throw new Error("PrismaService not available");
      const [user, sessionValid] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, tokenVersion: true },
        }),
        this.isUserSessionActive(userId, sid),
      ]);
      if (
        !user ||
        !sessionValid ||
        (user.tokenVersion ?? 0) !== (payload.tokenVersion ?? 0)
      ) {
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
              const { tokenVersion, orgIds: currentOrgIds } =
                await this.getValidatedUserState(userId, currentPayload.sid);
              if (tokenVersion !== (currentPayload.tokenVersion ?? 0)) {
                throw new Error("User session revoked");
              }
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
}
