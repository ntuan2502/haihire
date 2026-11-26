import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type {
  Application,
  OrganizationAiStatusResponse,
} from "@haihire/shared";
import { AiScoreCard } from "./ai-score-card";

let mockAiStatus: OrganizationAiStatusResponse = {
  configured: true,
  enabled: true,
  autoScoreApplications: false,
  provider: "GEMINI",
  modelId: "gemini-4-hydrogen",
};
let mockCanManageIntegrations = true;
const mockTriggerMutateAsync = vi.fn();
let mockDetailedApplication: Application | undefined;

vi.mock("@/hooks/use-ai-setting-queries", () => ({
  useAiStatusQuery: () => ({ data: mockAiStatus }),
}));

vi.mock("@/hooks/use-application-queries", () => ({
  useApplication: (id: string | null | undefined) => ({
    data: id ? mockDetailedApplication : undefined,
  }),
  useTriggerAiScoreMutation: () => ({
    mutateAsync: mockTriggerMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => mockCanManageIntegrations,
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    locale: "en",
    t: (key: string, params?: Record<string, string | number>) => {
      const dict: Record<string, string> = {
        "applications.aiEvaluation.title": "AI Evaluation",
        "applications.aiEvaluation.notRunYet": "Not run yet",
        "applications.aiEvaluation.scoreButton": "Run AI Score",
        "applications.aiEvaluation.rescoreButton": "Re-score",
        "applications.aiEvaluation.scoringButton": "Queuing...",
        "applications.aiEvaluation.retryButton": "Retry scoring",
        "applications.aiEvaluation.unscoredHint":
          "Analyze CV and screening answers.",
        "applications.aiEvaluation.notConfiguredHint":
          "Configure AI provider first.",
        "applications.aiEvaluation.configureAiLink": "Configure AI",
        "applications.aiEvaluation.scoringInProgress": "AI is analyzing CV...",
        "applications.aiEvaluation.staleBadge": "Outdated",
        "applications.aiEvaluation.staleHint": "Inputs changed.",
        "applications.aiEvaluation.summaryLabel": "Executive Summary",
        "applications.aiEvaluation.strengthsLabel": "Key Strengths",
        "applications.aiEvaluation.gapsLabel": "Gaps & Risks",
        "applications.aiEvaluation.questionsLabel":
          "Suggested Interview Questions",
        "applications.aiEvaluation.toggleQuestions": `Show interview questions (${params?.count ?? 0})`,
        "applications.aiEvaluation.scoredWith": `Evaluated by ${params?.model ?? ""}`,
        "applications.aiEvaluation.criteriaCount": `${params?.count ?? 0} criteria`,
        "applications.aiEvaluation.expandAll": "Expand all",
        "applications.aiEvaluation.collapseAll": "Collapse all",
        "applications.aiEvaluation.confidenceLabel": "Confidence:",
        "applications.aiEvaluation.weightLabel": `Weight: ${params?.weight ?? 0}%`,
        "applications.aiEvaluation.evidenceLabel": "Evidence",
        "applications.aiEvaluation.confidenceLevels.high": "High",
        "applications.aiEvaluation.confidenceLevels.medium": "Medium",
        "applications.aiEvaluation.confidenceLevels.low": "Low",
        "jobs.wizard.categories.experience": "Experience",
        "jobs.wizard.categories.technical": "Technical",
        "jobs.wizard.categories.softSkills": "Soft Skills",
        "jobs.wizard.categories.custom": "Custom",
        "errors.GENERIC_ERROR": "Error",
      };
      return dict[key] || key;
    },
  }),
}));

const baseApplication: Application = {
  id: "app-1",
  candidateId: "cand-1",
  jobId: "job-1",
  candidateName: "Nguyen Van A",
  candidateEmail: "a@example.com",
  stage: "APPLIED",
  resumeUrl: "tenants/org-1/resumes/cv.pdf",
  resumeFileName: "cv.pdf",
  orderIndex: 0,
  matchScore: null,
  createdAt: "2026-11-26T00:00:00Z",
  updatedAt: "2026-11-26T00:00:00Z",
};

describe("AiScoreCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAiStatus = {
      configured: true,
      enabled: true,
      autoScoreApplications: false,
      provider: "GEMINI",
      modelId: "gemini-4-hydrogen",
    };
    mockCanManageIntegrations = true;
    mockTriggerMutateAsync.mockResolvedValue({});
  });

  it("triggers manual AI scoring when unscored and AI is enabled", async () => {
    render(<AiScoreCard application={baseApplication} canScore={true} />);

    expect(screen.getByText("Not run yet")).toBeInTheDocument();
    expect(screen.getByText("gemini-4-hydrogen")).toBeInTheDocument();
    expect(
      screen.getByText("Analyze CV and screening answers."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(
      screen.queryByText("Analyze CV and screening answers."),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(
      screen.getByText("Analyze CV and screening answers."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Run AI Score" }));
    await waitFor(() => {
      expect(mockTriggerMutateAsync).toHaveBeenCalledWith("app-1");
    });
  });

  it("shows AI setup link when AI provider is not configured", () => {
    mockAiStatus = {
      configured: false,
      enabled: false,
      autoScoreApplications: false,
    };

    render(<AiScoreCard application={baseApplication} canScore={true} />);

    expect(screen.getByText("Not run yet")).toBeInTheDocument();
    expect(
      screen.getByText("Configure AI provider first."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Configure AI" })).toHaveAttribute(
      "href",
      "/settings/integrations/ai",
    );
  });

  it("renders per-criterion accordion breakdown, evidence, confidence, strengths/gaps, and expand-all toggle", () => {
    render(
      <AiScoreCard
        canScore={true}
        application={{
          ...baseApplication,
          matchScore: 93,
          aiEvaluation: {
            id: "eval-1",
            applicationId: "app-1",
            status: "COMPLETED",
            overallScore: 93,
            breakdown: null,
            criteriaResults: [
              {
                key: "portfolio_quality",
                title: "Portfolio Quality & Impact",
                category: "Experience",
                weight: 70,
                normalizedWeight: 70,
                score: 10,
                maxScore: 10,
                confidence: 95,
                confidenceLevel: "high",
                evidence: "Portfolio showcases 8 end-to-end case studies.",
                strengths: ["8 complete case studies with business impact"],
                gaps: [],
              },
              {
                key: "ux_visual_craft",
                title: "UX & Visual Craft",
                category: "Technical",
                weight: 30,
                normalizedWeight: 30,
                score: 8,
                maxScore: 10,
                confidence: 82,
                confidenceLevel: "high",
                evidence: "Consistent design system and accessibility focus.",
                strengths: ["Strong hierarchy"],
                gaps: ["Missing motion prototype links"],
              },
            ],
            summary: "Strong match across design leadership criteria.",
            strengths: ["8 complete case studies with business impact"],
            gaps: ["Missing motion prototype links"],
            suggestedQuestions: ["Walk through your design system governance."],
            warningCode: null,
            cvExtractedChars: 2400,
            provider: "GEMINI",
            modelId: "gemini-4-hydrogen",
            errorMessage: null,
            isStale: true,
            scoredAt: "2026-11-26T02:00:00Z",
            createdAt: "2026-11-26T02:00:00Z",
            updatedAt: "2026-11-26T02:00:00Z",
          },
        }}
      />,
    );

    expect(screen.getByText("93")).toBeInTheDocument();
    expect(screen.getByText("/100")).toBeInTheDocument();
    expect(screen.getByText("2 criteria")).toBeInTheDocument();
    expect(screen.getByText("Outdated")).toBeInTheDocument();

    // All criteria collapsed by default
    expect(
      screen.queryByText("Portfolio showcases 8 end-to-end case studies."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Consistent design system and accessibility focus."),
    ).not.toBeInTheDocument();

    // Expand all reveals every criterion evidence & gaps
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(
      screen.getByText("Portfolio showcases 8 end-to-end case studies."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Consistent design system and accessibility focus."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Missing motion prototype links"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Show interview questions (1)" }),
    );
    expect(
      screen.getByText("Walk through your design system governance."),
    ).toBeInTheDocument();
  });

  it("hydrates full criteriaResults from useApplication when list payload omits aiEvaluation", () => {
    mockDetailedApplication = {
      ...baseApplication,
      matchScore: 48,
      aiScoreStatus: "COMPLETED",
      aiEvaluation: {
        id: "eval-hydrated",
        applicationId: "app-1",
        status: "COMPLETED",
        overallScore: 48,
        breakdown: null,
        criteriaResults: [
          {
            key: "backend_api",
            title: "Backend Architecture",
            category: "Technical",
            weight: 100,
            normalizedWeight: 100,
            score: 5,
            maxScore: 10,
            confidence: 85,
            confidenceLevel: "high",
            evidence: "Built REST APIs with PostgreSQL.",
            strengths: ["PostgreSQL experience"],
            gaps: ["No Docker CI proof"],
          },
        ],
        summary: "Partial backend match.",
        strengths: ["PostgreSQL experience"],
        gaps: ["No Docker CI proof"],
        suggestedQuestions: ["Tell us about Docker workflows."],
        warningCode: null,
        cvExtractedChars: 1402,
        provider: "GEMINI",
        modelId: "gemini-3.5-flash-lite",
        errorMessage: null,
        isStale: false,
        scoredAt: "2026-11-26T07:09:19.409Z",
        createdAt: "2026-11-26T06:33:59.110Z",
        updatedAt: "2026-11-26T07:11:38.138Z",
      },
    };

    try {
      render(
        <AiScoreCard
          canScore={true}
          application={{
            ...baseApplication,
            matchScore: 44,
            aiScoreStatus: "PROCESSING",
            aiEvaluation: null,
          }}
        />,
      );

      expect(screen.getByText("48")).toBeInTheDocument();
      expect(screen.getByText("Backend Architecture")).toBeInTheDocument();
      // Criterion stays collapsed by default until clicked
      expect(
        screen.queryByText("Built REST APIs with PostgreSQL."),
      ).not.toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: /Backend Architecture/i }),
      );
      expect(
        screen.getByText("Built REST APIs with PostgreSQL."),
      ).toBeInTheDocument();
    } finally {
      mockDetailedApplication = undefined;
    }
  });
});
