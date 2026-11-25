import { describe, expect, it } from "vitest";
import { computeAuditDiff } from "./audit-diff.util";

describe("computeAuditDiff", () => {
  it("extracts only changed fields and normalizes Dates", () => {
    const beforeDate = new Date("2026-01-01T00:00:00.000Z");
    const afterDate = new Date("2026-01-02T00:00:00.000Z");

    const changes = computeAuditDiff(
      {
        name: "Acme",
        slug: "acme",
        tags: ["a", "b"],
        updatedAt: beforeDate,
      },
      {
        name: "Acme Corp",
        slug: "acme",
        tags: ["a", "b"],
        updatedAt: afterDate,
      },
    );

    expect(changes).toEqual([
      { field: "name", before: "Acme", after: "Acme Corp" },
      {
        field: "updatedAt",
        before: "2026-01-01T00:00:00.000Z",
        after: "2026-01-02T00:00:00.000Z",
      },
    ]);
  });

  it("redacts sensitive credentials whenever changed while skipping unchanged secrets", () => {
    const changes = computeAuditDiff(
      {
        provider: "SMTP",
        smtpPass: "encrypted-old",
        resendApiKey: "same-key",
        sendgridApiKey: null,
      },
      {
        provider: "SMTP",
        smtpPass: "encrypted-new",
        resendApiKey: "same-key",
        sendgridApiKey: "encrypted-sg",
      },
    );

    expect(changes).toEqual([
      { field: "smtpPass", before: "[REDACTED]", after: "[REDACTED]" },
      { field: "sendgridApiKey", before: null, after: "[REDACTED]" },
    ]);
  });

  it("respects explicit fields list and custom redactFields", () => {
    const changes = computeAuditDiff(
      { a: 1, b: 2, customSecret: "old" },
      { a: 10, b: 20, customSecret: "" },
      { fields: ["a", "customSecret"], redactFields: ["customSecret"] },
    );

    expect(changes).toEqual([
      { field: "a", before: 1, after: 10 },
      { field: "customSecret", before: "[REDACTED]", after: null },
    ]);
  });
});
