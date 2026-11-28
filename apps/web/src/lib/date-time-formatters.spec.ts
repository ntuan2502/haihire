import { describe, expect, it } from "vitest";
import {
  addDaysToYmd,
  formatDate,
  formatDateTime,
  formatDayMonth,
} from "./date-time-formatters";

describe("date-time-formatters (extracted module)", () => {
  it("shifts calendar YYYY-MM-DD dates cleanly across month and leap-year boundaries", () => {
    expect(addDaysToYmd("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDaysToYmd("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToYmd("invalid-date", 3)).toBe("");
  });

  it("formats numeric dates, day/month, and dateTime consistently across formats", () => {
    expect(
      formatDate("2026-11-27", "numeric", { dateFormat: "DD/MM/YYYY" }),
    ).toBe("27/11/2026");
    expect(formatDayMonth("2026-11-05", { dateFormat: "DD/MM/YYYY" })).toBe(
      "05/11",
    );
    expect(
      formatDateTime("2026-11-27T08:05:00.000Z", {
        timezone: "UTC",
        dateFormat: "YYYY-MM-DD",
        timeFormat: "24H",
      }),
    ).toBe("2026-11-27 08:05");
  });
});
