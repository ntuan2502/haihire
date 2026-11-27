import { describe, expect, it } from "vitest";
import {
  jobApplicationFormConfigSchema,
  jobScoringConfigSchema,
} from "@haihire/shared";
import { extractPdfTextFromBuffer } from "../ai/pdf-text.util";
import {
  buildApplicationFormSubmissionSeed,
  buildJobBlueprintTemplates,
  buildTailoredCvTemplateInput,
  resolveAiTestScenarioForCandidate,
} from "./seed-ai-profiles.util";
import { buildCandidateCvPdf } from "./seed-cv-pdf.util";

describe("seed-ai-profiles & seed-cv-pdf utilities", () => {
  it("generates schema-valid applicationFormConfig and scoringConfig across all 20 job roles", () => {
    for (let i = 0; i < 20; i++) {
      const tpl = buildJobBlueprintTemplates(i, `Role #${i}`, "Engineering");
      expect(
        jobApplicationFormConfigSchema.safeParse(tpl.applicationFormConfig)
          .success,
      ).toBe(true);
      expect(jobScoringConfigSchema.safeParse(tpl.scoringConfig).success).toBe(
        true,
      );

      // Roles 6 and 7 are intentionally left empty for AI generation & fallback testing
      if (i === 6 || i === 7) {
        expect(tpl.scoringConfig.criteria).toHaveLength(0);
      } else {
        expect(tpl.scoringConfig.criteria.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("generates valid PDFs covering strong, scanned_minimal (<200 chars), very_long (>12k truncated), and prompt_injection modes", async () => {
    const strongPdf = buildCandidateCvPdf(
      buildTailoredCvTemplateInput({
        fullName: "Tran Strong",
        email: "strong@tun.io.vn",
        phone: "0901111222",
        gender: "MALE",
        targetRole: "Senior Full-Stack Engineer (React / Node.js)",
        primaryJobIndex: 0,
        candidateIdx: 2,
        scenario: "strong",
      }),
    );
    const strongExtracted = await extractPdfTextFromBuffer(strongPdf);
    expect(strongExtracted.rawLength).toBeGreaterThan(800);
    expect(strongExtracted.text).toContain("NestJS");

    const scannedPdf = buildCandidateCvPdf(
      buildTailoredCvTemplateInput({
        fullName: "Le Scanned",
        email: "scan@tun.io.vn",
        phone: "0901111333",
        gender: "FEMALE",
        targetRole: "Senior Backend Engineer",
        primaryJobIndex: 1,
        candidateIdx: 7,
        scenario: "scanned",
      }),
    );
    const scannedExtracted = await extractPdfTextFromBuffer(scannedPdf);
    expect(scannedExtracted.rawLength).toBeLessThan(200);

    const longPdf = buildCandidateCvPdf(
      buildTailoredCvTemplateInput({
        fullName: "Pham Long Dossier",
        email: "long@tun.io.vn",
        phone: "0901111444",
        gender: "MALE",
        targetRole: "Senior Backend Engineer",
        primaryJobIndex: 1,
        candidateIdx: 8,
        scenario: "truncated",
      }),
    );
    const longExtracted = await extractPdfTextFromBuffer(longPdf);
    expect(longExtracted.rawLength).toBeGreaterThan(12_000);
    expect(longExtracted.truncated).toBe(true);

    const injectionPdf = buildCandidateCvPdf(
      buildTailoredCvTemplateInput({
        fullName: "Ngo Injection",
        email: "inj@tun.io.vn",
        phone: "0901111555",
        gender: "FEMALE",
        targetRole: "Senior Backend Engineer",
        primaryJobIndex: 1,
        candidateIdx: 9,
        scenario: "prompt_injection",
      }),
    );
    const injectionExtracted = await extractPdfTextFromBuffer(injectionPdf);
    expect(injectionExtracted.text).toContain("SYSTEM OVERRIDE");
  });

  it("populates role-matched screeningAnswers and coverLetter for every scenario", () => {
    const jobTpl = buildJobBlueprintTemplates(
      0,
      "Senior Full-Stack Engineer (React / Node.js)",
      "Engineering",
    );
    expect(resolveAiTestScenarioForCandidate(1, 2)).toBe("strong");
    expect(resolveAiTestScenarioForCandidate(1, 6)).toBe("no_cv");

    const sub = buildApplicationFormSubmissionSeed({
      candidateName: "Demo Strong",
      jobTitle: "Senior Full-Stack Engineer (React / Node.js)",
      formConfig: jobTpl.applicationFormConfig,
      scenario: "strong",
      candidateIdx: 2,
    });
    expect(sub.coverLetter.length).toBeGreaterThan(50);
    expect(sub.screeningAnswers).toHaveLength(
      jobTpl.applicationFormConfig.screeningQuestions.length,
    );
  });
});
