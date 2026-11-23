import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CandidateNotesStream } from "./candidate-notes-stream";

const mockAddNoteMutateAsync = vi.fn().mockResolvedValue({});
const mockUpdateNoteMutateAsync = vi.fn().mockResolvedValue({});
const mockDeleteNoteMutateAsync = vi.fn().mockResolvedValue({});

const mockNotes = [
  {
    id: "note-1",
    organizationId: "org-1",
    candidateId: "cand-1",
    authorId: "user-1",
    authorName: "Jane Recruiter",
    authorRole: "RECRUITER",
    content: "Strong candidate for fullstack positions",
    isEdited: false,
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-01T10:00:00Z",
  },
  {
    id: "note-2",
    organizationId: "org-1",
    candidateId: "cand-1",
    authorId: "user-2",
    authorName: "Bob Interviewer",
    authorRole: "INTERVIEWER",
    content: "Needs salary alignment check",
    isEdited: true,
    createdAt: "2026-11-02T10:00:00Z",
    updatedAt: "2026-11-02T11:00:00Z",
  },
];

let currentNotes = mockNotes;

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      name: "Jane Recruiter",
      role: "RECRUITER",
      organizationId: "org-1",
      isOwner: false,
    },
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useCandidateNotes: () => ({
    data: currentNotes,
    isLoading: false,
  }),
  useAddCandidateNoteMutation: () => ({
    mutateAsync: mockAddNoteMutateAsync,
    isPending: false,
  }),
  useUpdateCandidateNoteMutation: () => ({
    mutateAsync: mockUpdateNoteMutateAsync,
    isPending: false,
  }),
  useDeleteCandidateNoteMutation: () => ({
    mutateAsync: mockDeleteNoteMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "candidates.notes": "Ghi chú ứng viên",
        "applications.notesStream.subtitle": "Dòng thời gian ghi chú",
        "applications.notesStream.placeholder": "Viết ghi chú...",
        "applications.notesStream.keyboardHint": "Nhấn Ctrl + Enter để lưu",
        "applications.notesStream.cancel": "Hủy",
        "applications.notesStream.addNote": "Thêm ghi chú",
        "applications.notesStream.saving": "Đang lưu...",
        "applications.notesStream.empty": "Chưa có ghi chú nào",
        "applications.notesStream.emptyCompact": "Chưa có ghi chú",
        "applications.notesStream.edited": "(đã chỉnh sửa)",
        "applications.notesStream.editNote": "Sửa ghi chú",
        "applications.notesStream.deleteNote": "Xóa ghi chú",
        "applications.notesStream.deleteConfirm": "Bạn có chắc chắn muốn xóa?",
        "applications.notesStream.save": "Lưu thay đổi",
      };
      return dict[key] || key;
    },
  }),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CandidateNotesStream Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentNotes = mockNotes;
  });

  it("renders stream notes with author names, badges and contents", () => {
    render(<CandidateNotesStream candidateId="cand-1" />);

    expect(screen.getByText("Jane Recruiter")).toBeDefined();
    expect(
      screen.getByText("Strong candidate for fullstack positions"),
    ).toBeDefined();
    expect(screen.getByText("Bob Interviewer")).toBeDefined();
    expect(screen.getByText("Needs salary alignment check")).toBeDefined();
  });

  it("submits a new candidate note via composer", async () => {
    render(<CandidateNotesStream candidateId="cand-1" />);

    const textarea = screen.getByPlaceholderText("Viết ghi chú...");
    fireEvent.change(textarea, { target: { value: "New recruiter feedback" } });

    const addButton = screen.getByText("Thêm ghi chú");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockAddNoteMutateAsync).toHaveBeenCalledWith({
        candidateId: "cand-1",
        content: "New recruiter feedback",
      });
    });
  });

  it("allows starting and saving an inline edit for user's own note", async () => {
    render(<CandidateNotesStream candidateId="cand-1" />);

    const editButtons = screen.getAllByTitle("Sửa ghi chú");
    fireEvent.click(editButtons[0]);

    const editTextarea = screen.getByDisplayValue(
      "Strong candidate for fullstack positions",
    );
    fireEvent.change(editTextarea, {
      target: { value: "Updated: Exceeded expectations" },
    });

    const saveButton = screen.getByText("Lưu thay đổi");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateNoteMutateAsync).toHaveBeenCalledWith({
        candidateId: "cand-1",
        noteId: "note-1",
        content: "Updated: Exceeded expectations",
      });
    });
  });

  it("allows deleting user's own note after confirmation", async () => {
    render(<CandidateNotesStream candidateId="cand-1" />);

    const deleteButtons = screen.getAllByTitle("Xóa ghi chú");
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText("Bạn có chắc chắn muốn xóa?")).toBeDefined();

    const confirmDeleteBtn = screen.getByRole("button", {
      name: /Xóa ghi chú/i,
    });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(mockDeleteNoteMutateAsync).toHaveBeenCalledWith({
        candidateId: "cand-1",
        noteId: "note-1",
      });
    });
  });
});
