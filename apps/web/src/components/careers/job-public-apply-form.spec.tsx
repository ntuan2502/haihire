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
});
