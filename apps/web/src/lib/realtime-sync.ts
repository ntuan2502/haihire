import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { AppEventType } from "@haihire/shared";

const EVENT_QUERY_KEY_PREFIXES: Record<AppEventType, readonly QueryKey[]> = {
  CONNECTED: [],
  HEARTBEAT: [],
  ORG_UPDATED: [["organization"], ["jobs"], ["auth", "me", "permissions"]],
  MEMBERS_CHANGED: [
    ["organization", "members"],
    ["organization", "interviewers"],
  ],
  MEMBER_ROLE_UPDATED: [
    ["organization", "members"],
    ["organization", "interviewers"],
  ],
  MEMBER_REMOVED: [
    ["organization", "members"],
    ["organization", "interviewers"],
  ],
  INVITE_LINKS_CHANGED: [["organization", "invite-links"]],
  PERMISSIONS_CHANGED: [
    ["auth", "me", "permissions"],
    ["organization", "roles", "permissions"],
  ],
  AUDIT_LOGS_CHANGED: [["organization", "audit-logs"]],
  JOBS_CHANGED: [["jobs"]],
  CANDIDATES_CHANGED: [["candidates"]],
  APPLICATIONS_CHANGED: [["applications"], ["job-applications"]],
  INTERVIEWS_CHANGED: [["interviews"]],
  SOURCING_CHANGED: [["sourcing"]],
  EMAIL_CHANGED: [["email"]],
  WEBHOOKS_CHANGED: [["webhook-settings"]],
  ACTIVITIES_CHANGED: [["activities"]],
};

/**
 * Returns the React Query key prefixes that should be invalidated when an SSE
 * workspace event of the given type arrives.
 */
export function getQueryKeyPrefixesForEvent(
  eventType: AppEventType,
): readonly QueryKey[] {
  return EVENT_QUERY_KEY_PREFIXES[eventType];
}

export interface RealtimeInvalidator {
  schedule: (prefixes: readonly QueryKey[]) => void;
  scheduleForEvent: (eventType: AppEventType) => void;
  flush: () => void;
  cancel: () => void;
}

/**
 * Creates a debounced, deduplicating scheduler around `QueryClient.invalidateQueries`
 * so bursts of related SSE events (e.g. create application emitting 4 events) trigger
 * at most one invalidation per unique prefix within `delayMs`.
 */
export function createRealtimeInvalidator(
  queryClient: QueryClient,
  delayMs = 100,
): RealtimeInvalidator {
  const pending = new Map<string, QueryKey>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending.size === 0) return;

    const prefixes = Array.from(pending.values());
    pending.clear();

    for (const queryKey of prefixes) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };

  const schedule = (prefixes: readonly QueryKey[]) => {
    if (prefixes.length === 0) return;
    for (const prefix of prefixes) {
      pending.set(JSON.stringify(prefix), prefix);
    }

    if (delayMs <= 0) {
      flush();
      return;
    }

    if (timer === null) {
      timer = setTimeout(flush, delayMs);
    }
  };

  const scheduleForEvent = (eventType: AppEventType) => {
    schedule(getQueryKeyPrefixesForEvent(eventType));
  };

  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pending.clear();
  };

  return { schedule, scheduleForEvent, flush, cancel };
}
