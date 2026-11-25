import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { JobPublicApplyForm } from "./job-public-apply-form";
import type { Job } from "@/types";

const mockMutateAsync = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useCreateApplicationMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const dict: Record<string, string> = {
        "careers.submitApplication": "Submit Application Now",
        "careers.applicationFormSubtitle": "Fill in your details below.",
        "careers.firstName": "First name",
        "careers.lastName": "Last name",
        "careers.email": "Email address",
        "careers.phone": "Phone number (Optional)",
        "careers.phoneRequiredLabel": "Phone number",
        "careers.resume": "Resume attachment (CV)",
        "careers.dropCvHere": "Drop CV here",
        "careers.cvFormats": "PDF only",
        "careers.coverLetterLabel": "Cover letter",
        "careers.coverLetterPlaceholder": "Write your cover letter...",
        "careers.coverLetterCharsCount": `${params?.count ?? 0} / 10,000 characters`,
        "careers.screeningSectionTitle": "Screening questions",
        "careers.notes": "Notes",
        "careers.privacyNotice": "Privacy notice",
        "careers.placeholders.firstName": "Jane",
        "careers.placeholders.lastName": "Doe",
        "careers.placeholders.email": "jane@example.com",
        "careers.placeholders.phone": "0901234567",
        "careers.placeholders.notes": "Notes...",
        "careers.errorPhoneRequired": "Phone number is required.",
        "careers.errorCoverLetterRequired": "Cover letter is required.",
        "careers.errorScreeningRequired": `Required question: ${params?.question ?? ""}`,
        "careers.errorInvalidNumber": `Invalid number: ${params?.question ?? ""}`,
        "careers.errorInvalidDate": `Invalid date: ${params?.question ?? ""}`,
        "careers.errorInvalidUrl": `Invalid url: ${params?.question ?? ""}`,
        "careers.uploadScreeningPdf": "Upload PDF (max 10 MB)",
        "careers.urlAnswerPlaceholder": "https://...",
        "careers.numberAnswerPlaceholder": "Enter a number",
        "jobs.wizard.optionalOption": "Optional",
        "jobs.wizard.answerPlaceholder": "Your answer...",
        "common.yes": "Yes",
        "common.no": "No",
      };
      return dict[key] || key;
    },
  }),
}));

describe("JobPublicApplyForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ id: "app-1" });
  });

  const configuredJob: Job = {
    id: "job-1",
    title: "Staff Engineer",
    department: "Engineering",
    location: "Hanoi",
    type: "FULL_TIME",
    status: "PUBLISHED",
    description: "<p>Build systems</p>",
    organizationId: "org-1",
    createdAt: "2026-11-25T00:00:00Z",
    updatedAt: "2026-11-25T00:00:00Z",
    applicationFormConfig: {
      phone: "hidden",
      resume: "optional",
      coverLetter: "required",
      screeningQuestions: [
        {
          id: "q-years",
          text: "Years of experience?",
          type: "short_text",
          required: true,
        },
        {
          id: "q-work",
          text: "Work model?",
          type: "single_choice",
          required: true,
          options: ["Remote", "Hybrid"],
        },
      ],
    },
  };

  it("hides phone, validates required cover letter & screening questions, and submits FormData", async () => {
    render(
      <JobPublicApplyForm
        job={configuredJob}
        orgName="Acme"
        orgSlug="acme"
        nameDisplayOrder="FIRST_LAST"
        refParam={null}
      />,
    );

    expect(screen.queryByLabelText(/Phone number/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Cover letter/)).toBeInTheDocument();
    expect(screen.getByText("Years of experience?")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Jane"), {
      target: { value: "Jane" },
    });
    fireEvent.change(screen.getByPlaceholderText("Doe"), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("jane@example.com"), {
      target: { value: "jane@example.com" },
    });

    // Missing cover letter shows alert
    fireEvent.click(
      screen.getByRole("button", { name: "Submit Application Now" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cover letter is required.",
    );
    expect(mockMutateAsync).not.toHaveBeenCalled();

    // Fill cover letter & screening questions
    fireEvent.change(
      screen.getByPlaceholderText("Write your cover letter..."),
      {
        target: { value: "Excited to join Acme!" },
      },
    );
    fireEvent.change(screen.getByPlaceholderText("Your answer..."), {
      target: { value: "6 years" },
    });
    fireEvent.click(screen.getByLabelText("Remote"));

    fireEvent.click(
      screen.getByRole("button", { name: "Submit Application Now" }),
    );

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const submittedFormData = mockMutateAsync.mock.calls[0][0] as FormData;
    expect(submittedFormData.get("coverLetter")).toBe("Excited to join Acme!");
    expect(
      JSON.parse(String(submittedFormData.get("screeningAnswers"))),
    ).toEqual([
      { questionId: "q-years", answer: "6 years" },
      { questionId: "q-work", answer: "Remote" },
    ]);
  });

  it("renders, validates, and submits number, date, url, and PDF file_upload screening questions", async () => {
    const jobWithAllTypes: Job = {
      ...configuredJob,
      id: "job-all-types",
      applicationFormConfig: {
        phone: "hidden",
        resume: "hidden",
        coverLetter: "hidden",
        screeningQuestions: [
          { id: "q-num", text: "Years exp", type: "number", required: true },
          { id: "q-date", text: "Start date", type: "date", required: true },
          { id: "q-url", text: "Portfolio URL", type: "url", required: true },
          {
            id: "q-cert",
            text: "Certificate PDF",
            type: "file_upload",
            required: true,
          },
        ],
      },
    };

    render(
      <JobPublicApplyForm
        job={jobWithAllTypes}
        orgName="Acme"
        orgSlug="acme"
        nameDisplayOrder="FIRST_LAST"
        refParam={null}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Jane"), {
      target: { value: "Minh" },
    });
    fireEvent.change(screen.getByPlaceholderText("Doe"), {
      target: { value: "Le" },
    });
    fireEvent.change(screen.getByPlaceholderText("jane@example.com"), {
      target: { value: "minh@example.com" },
    });

    fireEvent.change(screen.getByLabelText(/Years exp/), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText(/Start date/), {
      target: { value: "2026-12-01" },
    });
    fireEvent.change(screen.getByLabelText(/Portfolio URL/), {
      target: { value: "not-a-valid-url" },
    });
    const pdfFile = new File(["%PDF-1.4\n%%EOF"], "certificate.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(screen.getByLabelText("Certificate PDF"), {
      target: { files: [pdfFile] },
    });

    // Invalid URL triggers inline alert
    fireEvent.click(
      screen.getByRole("button", { name: "Submit Application Now" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid url: Portfolio URL",
    );
    expect(mockMutateAsync).not.toHaveBeenCalled();

    // Fix URL and submit
    fireEvent.change(screen.getByLabelText(/Portfolio URL/), {
      target: { value: "https://portfolio.dev" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit Application Now" }),
    );

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const submittedFormData = mockMutateAsync.mock.calls[0][0] as FormData;
    expect(submittedFormData.get("screeningFile:q-cert")).toBeInstanceOf(File);
    expect((submittedFormData.get("screeningFile:q-cert") as File).name).toBe(
      "certificate.pdf",
    );
    expect(
      JSON.parse(String(submittedFormData.get("screeningAnswers"))),
    ).toEqual([
      { questionId: "q-num", answer: 4 },
      { questionId: "q-date", answer: "2026-12-01" },
      { questionId: "q-url", answer: "https://portfolio.dev" },
      { questionId: "q-cert", answer: null },
    ]);
  });
});
