import { describe, it, expect } from "vitest";
import {
  submitScorecardSchema,
  resolveChannelFromDomain,
  SourcingChannel,
  interpolateEmail,
  interpolateEmailSubject,
  hasPermission,
  Role,
  formatPersonDisplayName,
  DEFAULT_JOB_APPLICATION_FORM_CONFIG,
  jobApplicationFormConfigSchema,
  normalizeJobApplicationFormConfig,
} from "../index";

describe("@haihire/shared Contracts", () => {
  describe("submitScorecardSchema", () => {
    it("accepts a valid structured scorecard object", () => {
      const result = submitScorecardSchema.safeParse({
        scorecard: {
          overallRating: 4,
          recommendation: "YES",
          technicalScore: 5,
          feedback: "Strong system design",
        },
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid JSON-stringified scorecard", () => {
      const result = submitScorecardSchema.safeParse({
        scorecard: JSON.stringify({
          overallRating: 5,
          recommendation: "STRONG_YES",
          feedback: "Excellent interview",
        }),
      });
      expect(result.success).toBe(true);
    });

    it("rejects arbitrary unvalidated records such as { scorecardData: { overallRating: 999 } }", () => {
      const result = submitScorecardSchema.safeParse({
        scorecard: {
          scorecardData: { overallRating: 999 },
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid JSON strings and out-of-range JSON stringified scorecards", () => {
      expect(
        submitScorecardSchema.safeParse({ scorecard: "{invalid json" }).success,
      ).toBe(false);
      expect(
        submitScorecardSchema.safeParse({ scorecard: "plain string" }).success,
      ).toBe(false);
      expect(
        submitScorecardSchema.safeParse({
          scorecard: JSON.stringify({
            overallRating: 999,
            recommendation: "YES",
          }),
        }).success,
      ).toBe(false);
    });
  });

  describe("resolveChannelFromDomain", () => {
    it("uses domain boundary matching and avoids false substring hits for x.com", () => {
      expect(resolveChannelFromDomain("https://dropbox.com/file")).not.toBe(
        SourcingChannel.TWITTER_X,
      );
      expect(resolveChannelFromDomain("https://dropbox.com/file")).toBe(
        SourcingChannel.OTHER,
      );
      expect(resolveChannelFromDomain("https://netflix.com")).not.toBe(
        SourcingChannel.TWITTER_X,
      );
      expect(resolveChannelFromDomain("https://netflix.com")).toBe(
        SourcingChannel.OTHER,
      );
      expect(resolveChannelFromDomain("notx.com")).toBe(SourcingChannel.OTHER);
      expect(resolveChannelFromDomain("evil-linkedin.com")).toBe(
        SourcingChannel.OTHER,
      );
    });

    it("matches exact domains and subdomains accurately", () => {
      expect(resolveChannelFromDomain("https://x.com/handle")).toBe(
        SourcingChannel.TWITTER_X,
      );
      expect(resolveChannelFromDomain("mobile.x.com")).toBe(
        SourcingChannel.TWITTER_X,
      );
      expect(resolveChannelFromDomain("careers.google.com")).toBe(
        SourcingChannel.GOOGLE_JOBS,
      );
      expect(resolveChannelFromDomain("https://www.linkedin.com/jobs")).toBe(
        SourcingChannel.LINKEDIN,
      );
      expect(
        resolveChannelFromDomain("https://joinhandshake.com/students"),
      ).toBe(SourcingChannel.HANDSHAKE);
      expect(resolveChannelFromDomain(null)).toBe(SourcingChannel.DIRECT);
    });
  });

  describe("interpolateEmailSubject", () => {
    it("preserves plain-text characters without HTML entity escaping while escaping HTML in body", () => {
      const subject = interpolateEmailSubject("Interview for {{role}}", {
        role: "R&D Engineer",
      });
      expect(subject).toBe("Interview for R&D Engineer");
      expect(subject).not.toContain("&amp;");

      const htmlBody = interpolateEmail("<p>{{role}}</p>", {
        role: "R&D <script>alert(1)</script>",
      });
      expect(htmlBody).toBe(
        "<p>R&amp;D &lt;script&gt;alert(1)&lt;/script&gt;</p>",
      );
    });

    it("strips CR/LF characters to prevent email header injection", () => {
      const subject = interpolateEmailSubject(
        "Interview for {{role}}\r\nBcc: attacker@evil.com",
        {
          role: "Backend\r\nLead",
        },
      );
      expect(subject).not.toMatch(/[\r\n]/);
      expect(subject).toContain("Backend");
      expect(subject).toContain("Lead");
    });
  });

  describe("hasPermission & formatPersonDisplayName sanity checks", () => {
    it("enforces role permissions and owner bypass", () => {
      expect(hasPermission(Role.ADMIN, "org:delete")).toBe(true);
      expect(hasPermission(Role.MEMBER, "job:create")).toBe(false);
      expect(hasPermission(Role.MEMBER, "org:delete", true)).toBe(true);
    });

    it("formats person display names respecting name order", () => {
      expect(
        formatPersonDisplayName(
          { firstName: "Tuấn", lastName: "Nguyễn Anh" },
          "LAST_FIRST",
        ),
      ).toBe("Nguyễn Anh Tuấn");
      expect(
        formatPersonDisplayName(
          { firstName: "Jane", lastName: "Doe" },
          "FIRST_LAST",
        ),
      ).toBe("Jane Doe");
    });
  });

  describe("jobApplicationFormConfigSchema & normalizeJobApplicationFormConfig", () => {
    it("normalizes null, legacy values, and choice question options cleanly", () => {
      expect(normalizeJobApplicationFormConfig(null)).toEqual(
        DEFAULT_JOB_APPLICATION_FORM_CONFIG,
      );

      const legacy = normalizeJobApplicationFormConfig({
        phone: "required",
        resume: "off",
        coverLetter: "optional",
        screeningQuestions: [
          {
            id: "q1",
            text: "Years of experience?",
            type: "text",
            required: true,
          },
          {
            id: "q2",
            text: "Broken choice",
            type: "single_choice",
            required: false,
            options: ["OnlyOne"],
          },
        ],
      });

      expect(legacy.phone).toBe("required");
      expect(legacy.resume).toBe("hidden");
      expect(legacy.coverLetter).toBe("optional");
      expect(legacy.screeningQuestions).toEqual([
        {
          id: "q1",
          text: "Years of experience?",
          type: "short_text",
          required: true,
        },
      ]);
    });

    it("rejects single_choice questions with fewer than 2 options", () => {
      const invalid = jobApplicationFormConfigSchema.safeParse({
        phone: "optional",
        resume: "required",
        coverLetter: "hidden",
        screeningQuestions: [
          {
            id: "q1",
            text: "Work mode?",
            type: "single_choice",
            required: true,
            options: ["Remote"],
          },
        ],
      });
      expect(invalid.success).toBe(false);
    });
  });
});
