import { describe, expect, it } from "vitest";
import { AVAILABLE_VARIABLES, buildDynamicEmailContext } from "./variable-registry";

describe("VariableRegistry", () => {
  it("should contain standard available variable descriptors", () => {
    expect(AVAILABLE_VARIABLES.length).toBeGreaterThanOrEqual(10);
    const candidateNameVar = AVAILABLE_VARIABLES.find((v) => v.key === "candidate_name");
    expect(candidateNameVar).toBeDefined();
    expect(candidateNameVar?.category).toBe("candidate");
  });

  it("should build dynamic context mapping flat and dot-notation tokens", () => {
    const context = buildDynamicEmailContext({
      candidate: {
        name: "Nguyễn Văn An",
        email: "an.nguyen@example.com",
        phone: "0912 345 678",
      },
      job: {
        title: "Senior Backend Engineer",
        department: "Kỹ thuật",
        location: "Hà Nội",
        salaryRange: "30,000,000 - 45,000,000 VND",
      },
      organization: {
        name: "Nexus Tech",
      },
      interview: {
        date: "25/09/2026",
        time: "10:00",
        format: "Google Meet",
        linkOrLocation: "https://meet.google.com/abc-xyz",
        interviewer: "Hải Nam",
      },
      sender: {
        name: "Tuyển dụng Nexus",
      },
      custom: {
        start_date: "01/10/2026",
      },
    });

    // Verify flat tokens
    expect(context["candidate_name"]).toBe("Nguyễn Văn An");
    expect(context["job_title"]).toBe("Senior Backend Engineer");
    expect(context["company_name"]).toBe("Nexus Tech");
    expect(context["interview_date"]).toBe("25/09/2026");
    expect(context["interview_time"]).toBe("10:00");
    expect(context["start_date"]).toBe("01/10/2026");

    // Verify dot-notation tokens
    expect(context["candidate.name"]).toBe("Nguyễn Văn An");
    expect(context["job.title"]).toBe("Senior Backend Engineer");
    expect(context["organization.name"]).toBe("Nexus Tech");
  });

  it("should handle empty or null values gracefully without throwing", () => {
    const context = buildDynamicEmailContext({});
    expect(context).toEqual({});
  });
});
