import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { APP_EVENT_TYPES } from "@haihire/shared";
import { queryKeys } from "@/hooks/query-keys";
import {
  createRealtimeInvalidator,
  getQueryKeyPrefixesForEvent,
} from "./realtime-sync";

function matchesPrefix(
  prefix: readonly unknown[],
  key: readonly unknown[],
): boolean {
  return (
    prefix.length <= key.length &&
    prefix.every((segment, index) => segment === key[index])
  );
}

describe("realtime-sync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps every AppEventType to a defined prefix list", () => {
    for (const eventType of APP_EVENT_TYPES) {
      expect(Array.isArray(getQueryKeyPrefixesForEvent(eventType))).toBe(true);
    }

    expect(getQueryKeyPrefixesForEvent("CONNECTED")).toEqual([]);
    expect(getQueryKeyPrefixesForEvent("HEARTBEAT")).toEqual([]);
  });

  it("produces prefixes matching real queryKeys factories", () => {
    expect(
      getQueryKeyPrefixesForEvent("APPLICATIONS_CHANGED").some((prefix) =>
        matchesPrefix(prefix, queryKeys.applications("job-1")),
      ),
    ).toBe(true);
    expect(
      getQueryKeyPrefixesForEvent("APPLICATIONS_CHANGED").some((prefix) =>
        matchesPrefix(prefix, queryKeys.paginatedApplications({ page: 1 })),
      ),
    ).toBe(true);
    expect(
      getQueryKeyPrefixesForEvent("CANDIDATES_CHANGED").some((prefix) =>
        matchesPrefix(prefix, queryKeys.candidate("cand-1")),
      ),
    ).toBe(true);
    expect(
      getQueryKeyPrefixesForEvent("JOBS_CHANGED").some((prefix) =>
        matchesPrefix(prefix, queryKeys.jobs("org-1")),
      ),
    ).toBe(true);
    expect(
      getQueryKeyPrefixesForEvent("INTERVIEWS_CHANGED").some((prefix) =>
        matchesPrefix(prefix, queryKeys.interview("int-1")),
      ),
    ).toBe(true);
    expect(
      getQueryKeyPrefixesForEvent("SOURCING_CHANGED").some((prefix) =>
        matchesPrefix(prefix, queryKeys.sourcingLinks({})),
      ),
    ).toBe(true);
    expect(
      getQueryKeyPrefixesForEvent("EMAIL_CHANGED").some((prefix) =>
        matchesPrefix(prefix, queryKeys.emailTemplates("org-1")),
      ),
    ).toBe(true);
    expect(
      getQueryKeyPrefixesForEvent("WEBHOOKS_CHANGED").some((prefix) =>
        matchesPrefix(prefix, queryKeys.webhookSettings("org-1")),
      ),
    ).toBe(true);
    expect(
      getQueryKeyPrefixesForEvent("ACTIVITIES_CHANGED").some((prefix) =>
        matchesPrefix(prefix, queryKeys.candidateActivities("cand-1")),
      ),
    ).toBe(true);
    expect(
      getQueryKeyPrefixesForEvent("MEMBERS_CHANGED").some((prefix) =>
        matchesPrefix(prefix, queryKeys.orgInterviewers()),
      ),
    ).toBe(true);
    expect(
      getQueryKeyPrefixesForEvent("AUDIT_LOGS_CHANGED").some((prefix) =>
        matchesPrefix(prefix, queryKeys.auditLogs({})),
      ),
    ).toBe(true);
  });

  it("coalesces burst events and deduplicates repeated query key prefixes", () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const invalidator = createRealtimeInvalidator(queryClient, 100);

    invalidator.scheduleForEvent("CONNECTED");
    invalidator.scheduleForEvent("HEARTBEAT");
    expect(invalidateSpy).not.toHaveBeenCalled();

    invalidator.scheduleForEvent("APPLICATIONS_CHANGED");
    invalidator.scheduleForEvent("CANDIDATES_CHANGED");
    invalidator.scheduleForEvent("APPLICATIONS_CHANGED");

    expect(invalidateSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(invalidateSpy).toHaveBeenCalledTimes(3);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["applications"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["job-applications"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["candidates"],
    });
  });

  it("cancels pending invalidations cleanly on unmount", () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const invalidator = createRealtimeInvalidator(queryClient, 100);

    invalidator.scheduleForEvent("JOBS_CHANGED");
    invalidator.cancel();
    vi.advanceTimersByTime(200);

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
