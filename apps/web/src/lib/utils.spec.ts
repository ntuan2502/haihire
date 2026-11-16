import { describe, it, expect, afterEach } from "vitest";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatFileSize,
  formatRelativeTime,
  formatTime,
  getInitials,
  getCandidateDisplayName,
  getUserDisplayName,
  normalizeDateForInput,
  fixUtf8String,
  parseCandidateDocuments,
  resetActiveLocalization,
  resolveCandidateProfile,
  setActiveLocalization,
} from "./utils";
import {
  getAllTimezoneOptions,
  getTimezoneSelectOptions,
  ORG_TIMEZONE_OPTIONS,
} from "@haihire/shared";

describe("Frontend utils", () => {
  it("preserves explicit structured candidate name fields without legacy inference", () => {
    expect(
      resolveCandidateProfile("Tran Van Minh", {
        firstName: " Minh ",
        lastName: " Tran Van ",
      }),
    ).toMatchObject({
      firstName: "Minh",
      lastName: "Tran Van",
      effectiveName: "Minh Tran Van",
    });

    expect(
      resolveCandidateProfile("Tran Van Minh", { firstName: " Minh " }),
    ).toMatchObject({
      firstName: "Minh",
      lastName: "",
      effectiveName: "Minh",
    });

    expect(
      resolveCandidateProfile(
        "Tran Van Minh",
        {
          firstName: "Minh",
          lastName: "Tran Van",
          displayName: "Minh (Tech)",
        },
        { nameDisplayOrder: "LAST_FIRST" },
      ),
    ).toMatchObject({
      firstName: "Minh",
      lastName: "Tran Van",
      displayName: "Minh (Tech)",
      effectiveName: "Minh (Tech)",
    });

    expect(
      resolveCandidateProfile(null, {
        firstName: "An",
        lastName: "Nguyễn Văn",
      }),
    ).toMatchObject({
      firstName: "An",
      lastName: "Nguyễn Văn",
      effectiveName: "An Nguyễn Văn",
    });
  });
  describe("cn (classnames utility)", () => {
    it("merges class names correctly", () => {
      const result = cn("base-class", true && "active", false && "hidden");
      expect(result).toContain("base-class");
      expect(result).toContain("active");
      expect(result).not.toContain("hidden");
    });
  });

  describe("formatDate", () => {
    it("returns dash for null or undefined", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate(undefined)).toBe("—");
    });

    it("formats valid date string with numeric style", () => {
      const date = new Date(2026, 7, 27); // Aug 27 2026
      const result = formatDate(date, "numeric");
      expect(result).toBe("08/27/2026");
    });

    it("formats valid date string with short style", () => {
      const date = new Date(2026, 7, 27);
      const result = formatDate(date, "short");
      expect(result).toBe("8/27/2026");
    });
  });

  describe("formatFileSize", () => {
    it("formats 0 bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(null)).toBe("0 B");
    });

    it("formats kilobytes and megabytes", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
    });
  });

  describe("getInitials", () => {
    it("returns dash for null or empty string", () => {
      expect(getInitials(null)).toBe("—");
      expect(getInitials("")).toBe("—");
    });

    it("extracts two initials from full name", () => {
      expect(getInitials("John Doe")).toBe("JD");
      expect(getInitials("Nguyen Van A")).toBe("NA");
    });

    it("handles single name", () => {
      expect(getInitials("Alice")).toBe("AL");
    });
  });

  describe("getCandidateDisplayName", () => {
    it("prioritizes displayName override, then firstName/lastName", () => {
      expect(
        getCandidateDisplayName({
          firstName: "Alice",
          lastName: "Smith",
          displayName: "Ali Smith",
        }),
      ).toBe("Ali Smith");

      expect(
        getCandidateDisplayName({
          firstName: "Alice",
          lastName: "Smith",
          displayName: null,
        }),
      ).toBe("Alice Smith");
    });

    it("unwraps nested application.candidate fields cleanly under nameDisplayOrder", () => {
      const appPayload = {
        candidateName: "Legacy Fallback Name",
        candidate: {
          firstName: "An",
          lastName: "Nguyễn Văn",
          displayName: null,
        },
      };
      expect(
        getCandidateDisplayName(appPayload, { nameDisplayOrder: "FIRST_LAST" }),
      ).toBe("An Nguyễn Văn");
      expect(
        getCandidateDisplayName(appPayload, { nameDisplayOrder: "LAST_FIRST" }),
      ).toBe("Nguyễn Văn An");
      expect(
        getCandidateDisplayName({
          ...appPayload,
          candidate: { ...appPayload.candidate, displayName: "An (Lead)" },
        }),
      ).toBe("An (Lead)");
    });

    it("falls back to candidateName if structured fields are absent", () => {
      const candidate = {
        candidateName: "Bob Jones",
      };
      expect(getCandidateDisplayName(candidate)).toBe("Bob Jones");
    });

    it("returns dash if null or empty", () => {
      expect(getCandidateDisplayName(null)).toBe("—");
      expect(getCandidateDisplayName({})).toBe("—");
    });
  });

  describe("formatRelativeTime", () => {
    it("returns dash for null or undefined", () => {
      expect(formatRelativeTime(null)).toBe("—");
      expect(formatRelativeTime(undefined)).toBe("—");
    });

    it("returns Just now for current timestamp", () => {
      expect(formatRelativeTime(new Date())).toBe("Just now");
    });

    it("returns minutes ago for dates within the hour", () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinAgo)).toBe("5m ago");
    });

    it("returns hours ago for dates within the day", () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000);
      expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago");
    });
  });

  describe("normalizeDateForInput", () => {
    it("handles empty or dash inputs", () => {
      expect(normalizeDateForInput(null)).toBe("");
      expect(normalizeDateForInput("—")).toBe("");
      expect(normalizeDateForInput("")).toBe("");
    });

    it("returns already formatted YYYY-MM-DD", () => {
      expect(normalizeDateForInput("2026-08-27")).toBe("2026-08-27");
    });

    it("normalizes MM/DD/YYYY format", () => {
      expect(normalizeDateForInput("08/27/2026")).toBe("2026-08-27");
    });
  });

  describe("fixUtf8String", () => {
    it("handles null or empty strings", () => {
      expect(fixUtf8String(null)).toBe("");
      expect(fixUtf8String("")).toBe("");
    });

    it("preserves already clean UTF-8 text", () => {
      expect(fixUtf8String("Nguyễn Văn A")).toBe("Nguyễn Văn A");
    });
  });

  describe("parseCandidateDocuments", () => {
    it("returns empty array when fallback has no resumeUrl", () => {
      expect(parseCandidateDocuments(undefined)).toEqual([]);
    });

    it("returns formatted document when fallbackApp provides resumeUrl", () => {
      const docs = parseCandidateDocuments({
        id: "app-1",
        resumeUrl: "/uploads/resume.pdf",
        resumeFileName: "My_Resume.pdf",
        resumeFileSize: 1024,
        resumeMimeType: "application/pdf",
        createdAt: "2026-09-28T00:00:00.000Z",
      });
      expect(docs.length).toBe(1);
      expect(docs[0].id).toBe("app-1");
      expect(docs[0].url).toBe("/uploads/resume.pdf");
      expect(docs[0].name).toBe("My_Resume.pdf");
    });
  });

  describe("Localized formatting utilities", () => {
    afterEach(() => {
      resetActiveLocalization();
    });

    it("formats date-only strings without shifting calendar days across timezones", () => {
      expect(
        formatDate("2026-08-27", "numeric", {
          dateFormat: "DD/MM/YYYY",
          timezone: "America/New_York",
        }),
      ).toBe("27/08/2026");

      expect(
        formatDate("2026-08-27", "numeric", {
          dateFormat: "YYYY-MM-DD",
          timezone: "America/New_York",
        }),
      ).toBe("2026-08-27");
    });

    it("converts full timestamps using the configured organization timezone", () => {
      // 2026-08-27T20:00:00Z is Aug 28 in Ho Chi Minh (UTC+7) and Aug 27 in New York (UTC-4)
      const iso = "2026-08-27T20:00:00.000Z";
      expect(
        formatDate(iso, "numeric", {
          dateFormat: "DD/MM/YYYY",
          timezone: "Asia/Ho_Chi_Minh",
        }),
      ).toBe("28/08/2026");

      expect(
        formatDate(iso, "numeric", {
          dateFormat: "MM/DD/YYYY",
          timezone: "America/New_York",
        }),
      ).toBe("08/27/2026");
    });

    it("formats 24H and 12H clock strings cleanly", () => {
      expect(formatTime("14:30", { timeFormat: "24H" })).toBe("14:30");
      expect(formatTime("14:30", { timeFormat: "12H" })).toBe("2:30 PM");
      expect(formatTime("00:05", { timeFormat: "12H" })).toBe("12:05 AM");
      expect(formatTime("12:00", { timeFormat: "12H" })).toBe("12:00 PM");
    });

    it("combines date and time in formatDateTime", () => {
      const result = formatDateTime("2026-08-27T07:30:00.000Z", {
        timezone: "Asia/Ho_Chi_Minh",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12H",
      });
      expect(result).toBe("27/08/2026 2:30 PM");
    });

    it("formats relative time in both Vietnamese and English", () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinAgo, { defaultLanguage: "vi" })).toBe(
        "5 phút trước",
      );
      expect(formatRelativeTime(fiveMinAgo, { defaultLanguage: "en" })).toBe(
        "5m ago",
      );
    });

    it("orders structured candidate names based on nameDisplayOrder and runtime state", () => {
      const candidate = { firstName: "An", lastName: "Nguyễn" };
      expect(
        getCandidateDisplayName(candidate, { nameDisplayOrder: "FIRST_LAST" }),
      ).toBe("An Nguyễn");
      expect(
        getCandidateDisplayName(candidate, { nameDisplayOrder: "LAST_FIRST" }),
      ).toBe("Nguyễn An");

      setActiveLocalization({ nameDisplayOrder: "LAST_FIRST" }, "vi");
      expect(getCandidateDisplayName(candidate)).toBe("Nguyễn An");
    });

    it("formats currencies accurately", () => {
      expect(formatCurrency(3500, "USD")).toContain("3,500");
      expect(formatCurrency(35000000, "VND")).toContain("₫");
    });

    it("provides curated canonical grouped timezones sorted strictly by UTC offset and maps aliases cleanly", async () => {
      const { canonicalizeTimezone, formatTimezoneOptionLabel } =
        await import("@haihire/shared");

      expect(ORG_TIMEZONE_OPTIONS.length).toBeGreaterThanOrEqual(80);
      expect(ORG_TIMEZONE_OPTIONS.length).toBeLessThanOrEqual(115);

      const winterZones = getAllTimezoneOptions(
        new Date("2026-01-15T12:00:00.000Z"),
      );
      const ids = winterZones.map((z) => z.value);
      expect(ids).toContain("UTC");
      expect(ids).toContain("Asia/Ho_Chi_Minh");
      expect(ids).toContain("Asia/Kolkata");
      expect(ids).toContain("Asia/Kathmandu");
      expect(ids).toContain("America/New_York");
      expect(ids).toContain("America/Phoenix");
      expect(ids).toContain("America/Denver");
      expect(ids).toContain("Pacific/Kiritimati");

      for (let i = 1; i < winterZones.length; i++) {
        const prev = winterZones[i - 1];
        const curr = winterZones[i];
        expect(prev.offsetMinutes).toBeLessThanOrEqual(curr.offsetMinutes);
        if (prev.offsetMinutes === curr.offsetMinutes && prev.value !== "UTC") {
          expect(curr.value).not.toBe("UTC");
          expect(
            prev.cityLabel.localeCompare(curr.cityLabel),
          ).toBeLessThanOrEqual(0);
        }
      }

      const hcmGroup = winterZones.find((z) => z.value === "Asia/Ho_Chi_Minh");
      expect(hcmGroup).toBeDefined();
      expect(formatTimezoneOptionLabel(hcmGroup!)).toBe(
        "(UTC+07:00) Bangkok, Hanoi, Ho Chi Minh City, Jakarta",
      );

      expect(canonicalizeTimezone("Asia/Bangkok")).toBe("Asia/Ho_Chi_Minh");
      expect(canonicalizeTimezone("Asia/Jakarta")).toBe("Asia/Ho_Chi_Minh");
      expect(canonicalizeTimezone("Asia/Saigon")).toBe("Asia/Ho_Chi_Minh");
      expect(canonicalizeTimezone("America/Toronto")).toBe("America/New_York");

      const kolkata = winterZones.find((z) => z.value === "Asia/Kolkata");
      const kathmandu = winterZones.find((z) => z.value === "Asia/Kathmandu");
      expect(kolkata?.offsetLabel).toBe("UTC+05:30");
      expect(kathmandu?.offsetLabel).toBe("UTC+05:45");

      const hcmIdx = ids.indexOf("Asia/Ho_Chi_Minh");
      const tokyoIdx = ids.indexOf("Asia/Tokyo");
      const nyIdx = ids.indexOf("America/New_York");
      expect(nyIdx).toBeLessThan(hcmIdx);
      expect(hcmIdx).toBeLessThan(tokyoIdx);

      // Canonical alias should not duplicate the canonical group option
      const selectOptsFromAlias = getTimezoneSelectOptions("Asia/Saigon");
      expect(
        selectOptsFromAlias.filter((o) => o.value === "Asia/Ho_Chi_Minh"),
      ).toHaveLength(1);
      expect(selectOptsFromAlias[0].value).not.toBe("Asia/Saigon");

      // Searchable keywords still allow finding groups by member city or alias IANA ID
      const hcmSelectOpt = selectOptsFromAlias.find(
        (o) => o.value === "Asia/Ho_Chi_Minh",
      );
      expect(hcmSelectOpt?.keywords).toContain("Asia/Bangkok");
      expect(hcmSelectOpt?.keywords).toContain("Asia/Jakarta");

      // Valid non-grouped IANA timezone falls back gracefully to a prepended option
      const rareOpts = getTimezoneSelectOptions("Antarctica/McMurdo");
      expect(rareOpts[0].value).toBe("Antarctica/McMurdo");
      expect(rareOpts[0].label).toContain("McMurdo");
    });

    it("formats user display names respecting FIRST_LAST and LAST_FIRST order", () => {
      const user = {
        firstName: "Tuấn",
        lastName: "Nguyễn Anh",
        email: "tuan@example.com",
      };
      expect(getUserDisplayName(user, { nameDisplayOrder: "FIRST_LAST" })).toBe(
        "Tuấn Nguyễn Anh",
      );
      expect(getUserDisplayName(user, { nameDisplayOrder: "LAST_FIRST" })).toBe(
        "Nguyễn Anh Tuấn",
      );
      expect(getUserDisplayName({ email: "only@example.com" })).toBe(
        "only@example.com",
      );
      expect(getUserDisplayName(null)).toBe("—");
    });
  });
});
