import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Application } from "@haihire/shared";
import { ApplicationFormCard } from "./application-form-card";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    locale: "en",
    t: (key: string, params?: Record<string, string | number>) => {
      const dict: Record<string, string> = {
        "applications.formCard.title": "Application Form",
        "applications.formCard.itemsCount": `${params?.count ?? 0} items`,
        "applications.formCard.emptyBadge": "No data",
        "applications.formCard.answerLabel": "Candidate Response",
        "applications.formCard.emptyState":
          "No cover letter or screening answers were submitted for this application.",
        "applications.formCard.types.cover_letter": "Cover Letter",
        "applications.formCard.types.short_text": "Short Text",
        "applications.formCard.types.long_text": "Long Text",
        "applications.formCard.types.single_choice": "Single Choice",
        "applications.formCard.types.multiple_choice": "Multiple Choice",
        "applications.formCard.types.number": "Number",
        "applications.formCard.types.date": "Date",
        "applications.formCard.types.url": "URL",
        "applications.formCard.types.yes_no": "Yes / No",
        "applications.formCard.types.file_upload": "File Attachment",
        "applications.sections.coverLetter": "Cover Letter",
        "applications.sections.noAnswerProvided": "Not answered",
        "applications.aiEvaluation.expandAll": "Expand all",
        "applications.aiEvaluation.collapseAll": "Collapse all",
        "common.yes": "Yes",
        "common.no": "No",
        "common.preview": "Preview",
        "common.download": "Download",
      };
      return dict[key] ?? key;
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
  coverLetter: "Passionate engineer with 5 years of distributed backend work.",
  screeningAnswers: [
    {
      questionId: "q-years",
      questionText: "Years of NestJS experience",
      questionType: "number",
      answer: 5,
    },
    {
      questionId: "q-skills",
      questionText: "Core databases used in production",
      questionType: "multiple_choice",
      answer: ["PostgreSQL", "Redis"],
    },
    {
      questionId: "q-remote",
      questionText: "Can you work hybrid in HCMC?",
      questionType: "yes_no",
      answer: true,
    },
    {
      questionId: "q-portfolio",
      questionText: "Architecture portfolio PDF",
      questionType: "file_upload",
      answer: {
        url: "/haihire-resumes/tenants/org-1/portfolio.pdf",
        fileName: "architecture-portfolio.pdf",
        mimeType: "application/pdf",
        size: 204800,
      },
    },
  ],
  createdAt: "2026-11-26T00:00:00Z",
  updatedAt: "2026-11-26T00:00:00Z",
};

describe("ApplicationFormCard", () => {
  it("returns null when application has neither cover letter nor screening answers unless showEmptyState is true", () => {
    const emptyApp = {
      ...baseApplication,
      coverLetter: "",
      screeningAnswers: [],
    };
    const { container } = render(
      <ApplicationFormCard application={emptyApp} />,
    );
    expect(container.firstChild).toBeNull();

    render(<ApplicationFormCard application={emptyApp} showEmptyState />);
    expect(screen.getByText("Application Form")).toBeInTheDocument();
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No cover letter or screening answers were submitted for this application.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(
      screen.queryByText(
        "No cover letter or screening answers were submitted for this application.",
      ),
    ).not.toBeInTheDocument();
  });

  it("renders collapsed by default and supports expand/collapse and file actions", () => {
    const onPreviewDoc = vi.fn();
    const onDownloadDoc = vi.fn();

    render(
      <ApplicationFormCard
        application={baseApplication}
        onPreviewDoc={onPreviewDoc}
        onDownloadDoc={onDownloadDoc}
      />,
    );

    expect(screen.getByText("Application Form")).toBeInTheDocument();
    expect(screen.getByText("5 items")).toBeInTheDocument();

    // Collapsed by default: expanded "Candidate Response" label is hidden
    expect(screen.queryByText("Candidate Response")).not.toBeInTheDocument();

    // Expand all reveals choices and file preview/download controls
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getAllByText("Candidate Response")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(onPreviewDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "architecture-portfolio.pdf",
        sourceApplicationId: "app-1",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(onDownloadDoc).toHaveBeenCalledWith(
      "/haihire-resumes/tenants/org-1/portfolio.pdf",
      "architecture-portfolio.pdf",
      "app-1",
    );
  });
});
