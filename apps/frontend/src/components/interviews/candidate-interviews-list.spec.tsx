import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CandidateInterviewsList } from "./candidate-interviews-list";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

// Mock i18n
vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "applications.noInterviews": "Chưa có lịch phỏng vấn",
        "applications.noInterviewsDesc": "Lên lịch phỏng vấn đầu tiên cho ứng viên này.",
        "applications.scheduleInterview": "Lên lịch phỏng vấn",
        "applications.sections.interviews": "Phỏng vấn",
        "interviews.types.hrScreening": "HR Sơ loại",
        "interviews.types.technical": "Kỹ thuật",
        "interviews.latestUpcomingSchedule": "Lịch phỏng vấn gần nhất / sắp tới",
        "interviews.currentScheduleBadge": "Lịch hiện tại",
        "interviews.completedScheduleBadge": "Đã qua",
        "interviews.cancelThisSchedule": "Hủy lịch này",
        "interviews.cancelInterviewTitle": "Hủy lịch phỏng vấn",
        "interviews.cancelInterviewWarning": "Buổi phỏng vấn này sẽ bị hủy",
        "common.cancelConfirmWord": "HỦY",
        "common.cancel": "Hủy",
        "interviews.editScheduleBtn": "Chỉnh sửa lịch phỏng vấn",
        "interviews.updateBtn": "Cập nhật",
        "interviews.atOffice": "Tại văn phòng",
        "interviews.round": "Vòng",
      };
      return translations[key] || key;
    },
  }),
}));

describe("CandidateInterviewsList Regression & Component Tests", () => {
  const mockInterview: ScheduledInterviewInfo = {
    id: "intv-uuid-12345",
    applicationId: "app-uuid-67890",
    date: "2026-09-30",
    time: "10:00",
    type: "HR_SCREENING",
    format: "OFFICE",
    linkOrLocation: "Phòng họp A",
    interviewer: "Admin HR",
    round: 1,
    notes: "Kiểm tra kỹ năng giao tiếp",
  };

  it("renders empty state correctly when there are no interviews", () => {
    render(<CandidateInterviewsList application={{ interviews: [] }} />);
    expect(screen.getByText("Chưa có lịch phỏng vấn")).toBeInTheDocument();
  });

  it("renders scheduled interview card with correct details", () => {
    render(
      <CandidateInterviewsList
        application={{
          interviews: [
            {
              id: mockInterview.id,
              applicationId: mockInterview.applicationId,
              date: mockInterview.date,
              time: mockInterview.time,
              type: mockInterview.type,
              format: mockInterview.format,
              linkOrLocation: mockInterview.linkOrLocation,
              interviewer: mockInterview.interviewer,
              round: mockInterview.round,
              notes: mockInterview.notes,
            },
          ],
        }}
      />
    );

    expect(screen.getByText("HR Sơ loại")).toBeInTheDocument();
    expect(screen.getByText("Admin HR")).toBeInTheDocument();
    expect(screen.getByText("Lịch hiện tại")).toBeInTheDocument();
  });

  it("REGRESSION TEST: clicking cancel button passes ScheduledInterviewInfo and NEVER a MouseEvent", () => {
    const handleCancel = vi.fn();

    render(
      <CandidateInterviewsList
        application={{
          interviews: [
            {
              id: mockInterview.id,
              applicationId: mockInterview.applicationId,
              date: mockInterview.date,
              time: mockInterview.time,
              type: mockInterview.type,
              format: mockInterview.format,
              linkOrLocation: mockInterview.linkOrLocation,
              interviewer: mockInterview.interviewer,
              round: mockInterview.round,
            },
          ],
        }}
        onCancelInterview={handleCancel}
      />
    );

    const cancelButton = screen.getByText("Hủy lịch này");
    expect(cancelButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(cancelButton);
    });

    // Modal is opened, confirmation match text required
    const confirmInput = screen.getByRole("textbox");
    act(() => {
      fireEvent.change(confirmInput, { target: { value: "HỦY" } });
    });
    act(() => {
      fireEvent.submit(confirmInput.closest("form")!);
    });

    // 1. Must be called exactly once
    expect(handleCancel).toHaveBeenCalledTimes(1);

    // 2. The argument passed MUST be the interview object with valid id
    const calledArg = handleCancel.mock.calls[0][0];
    expect(calledArg).toBeDefined();
    expect(typeof calledArg).toBe("object");
    expect(calledArg.id).toBe("intv-uuid-12345");

    // 3. Must NOT be a React SyntheticEvent or MouseEvent (preventing [object Object] in URL)
    expect(calledArg.nativeEvent).toBeUndefined();
    expect(calledArg.preventDefault).toBeUndefined();
    expect(calledArg.stopPropagation).toBeUndefined();
  });

  it("clicking edit schedule invokes onSchedule with the interview object", () => {
    const handleSchedule = vi.fn();

    render(
      <CandidateInterviewsList
        application={{
          interviews: [
            {
              id: mockInterview.id,
              applicationId: mockInterview.applicationId,
              date: mockInterview.date,
              time: mockInterview.time,
              type: mockInterview.type,
              format: mockInterview.format,
              linkOrLocation: mockInterview.linkOrLocation,
              interviewer: mockInterview.interviewer,
            },
          ],
        }}
        onSchedule={handleSchedule}
      />
    );

    const editButton = screen.getByText("Chỉnh sửa lịch phỏng vấn");
    fireEvent.click(editButton);

    expect(handleSchedule).toHaveBeenCalledTimes(1);
    expect(handleSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ id: "intv-uuid-12345" })
    );
  });
});
