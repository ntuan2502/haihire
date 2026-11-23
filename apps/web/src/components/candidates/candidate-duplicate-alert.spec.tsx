import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CandidateDuplicateCheckResult } from "@haihire/shared";
import { CandidateDuplicateAlert } from "./candidate-duplicate-alert";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "candidates.duplicate.blockingTitle":
          "Email already exists in this organization",
        "candidates.duplicate.blockingDesc":
          "Each candidate within an organization must have a unique email address.",
        "candidates.duplicate.warningTitle":
          "Similar candidate profile detected",
        "candidates.duplicate.warningDesc":
          "These details match an existing candidate profile.",
        "candidates.duplicate.detailWarningTitle":
          "Potential duplicate profile detected",
        "candidates.duplicate.detailWarningDesc":
          "This candidate shares matching details with another profile.",
        "candidates.duplicate.reasonEmail": "Same email",
        "candidates.duplicate.reasonPhone": "Same phone",
        "candidates.duplicate.reasonNameDob": "Same name & DOB",
        "candidates.duplicate.viewProfile": "View profile",
      };
      return dict[key] || key;
    },
  }),
}));

describe("CandidateDuplicateAlert", () => {
  it("renders nothing when result is undefined or has no matches", () => {
    const { container: c1 } = render(
      <CandidateDuplicateAlert result={undefined} />,
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <CandidateDuplicateAlert
        result={{
          hasBlockingDuplicate: false,
          hasWarningDuplicate: false,
          matches: [],
        }}
      />,
    );
    expect(c2.firstChild).toBeNull();
  });

  it("renders blocking email alert and warning phone/name+DOB alert in form mode", () => {
    const result: CandidateDuplicateCheckResult = {
      hasBlockingDuplicate: true,
      hasWarningDuplicate: true,
      matches: [
        {
          id: "cand-email",
          name: "Nguyen Van A",
          email: "nguyenvana@example.com",
          phone: "0901234567",
          dateOfBirth: "1995-05-20",
          matchReasons: ["EMAIL"],
          severity: "BLOCKING",
        },
        {
          id: "cand-soft",
          name: "Nguyen Van A Alt",
          email: "alt@example.com",
          phone: "+84 901 234 567",
          dateOfBirth: "1995-05-20",
          matchReasons: ["PHONE", "NAME_DOB"],
          severity: "WARNING",
        },
      ],
    };

    render(<CandidateDuplicateAlert result={result} mode="form" />);

    expect(
      screen.getByTestId("candidate-duplicate-blocking-alert"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Email already exists in this organization"),
    ).toBeInTheDocument();
    expect(screen.getByText("Same email")).toBeInTheDocument();

    expect(
      screen.getByTestId("candidate-duplicate-warning-alert"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Similar candidate profile detected"),
    ).toBeInTheDocument();
    expect(screen.getByText("Same phone")).toBeInTheDocument();
    expect(screen.getByText("Same name & DOB")).toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: /View profile/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/candidates/cand-email");
    expect(links[1]).toHaveAttribute("href", "/candidates/cand-soft");
  });

  it("renders detail warning copy when mode is detail", () => {
    const result: CandidateDuplicateCheckResult = {
      hasBlockingDuplicate: false,
      hasWarningDuplicate: true,
      matches: [
        {
          id: "cand-2",
          name: "Tran Thi B",
          email: "tranthib@example.com",
          phone: "0912345678",
          dateOfBirth: null,
          matchReasons: ["PHONE"],
          severity: "WARNING",
        },
      ],
    };

    render(<CandidateDuplicateAlert result={result} mode="detail" />);

    expect(
      screen.queryByTestId("candidate-duplicate-blocking-alert"),
    ).toBeNull();
    expect(
      screen.getByTestId("candidate-duplicate-warning-alert"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Potential duplicate profile detected"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View profile/i })).toHaveAttribute(
      "href",
      "/candidates/cand-2",
    );
  });
});
