# Báo cáo Kiểm chứng & Hoàn tất Phase 12: Frontend State Machine Alignment

**Mã dự án:** HaiHire ATS  
**Giai đoạn:** Phase 12 — Frontend State Machine Alignment  
**Người thực hiện:** Senior Frontend Architect & SRE Auditor (`@frontend-specialist`)  
**Ngày báo cáo:** 02/10/2026  
**Trạng thái:** 🟢 **COMPLETED & APPROVED FOR SHIP**

---

## 1. Executive Summary

### 1.1 Mô tả Bug từ Thực tế & User Evidence
* **URL phát sinh:** `/dashboard/jobs/[id]/pipeline?stage=SCREENING&applicationId=[appId]`
* **Hành vi người dùng (User Action):** Người dùng thực hiện thao tác kéo (drag) hoặc click chuyển đổi hồ sơ ứng viên từ cột `SCREENING` (Sàng lọc) quay ngược lại `APPLIED` (Mới nộp / New).
* **Phản hồi từ Backend:**
  ```http
  HTTP 400 Bad Request
  Content-Type: application/json

  {
    "statusCode": 400,
    "code": "APPLICATION_INVALID_STAGE_TRANSITION",
    "message": "Cannot transition application stage from 'SCREENING' to 'APPLIED'",
    "params": {
      "currentStage": "SCREENING",
      "targetStage": "APPLIED"
    }
  }
  ```
* **Hiện trạng giao diện (Before Fix):**
  1. **Thiếu hoàn toàn cơ chế phòng ngừa (Zero Prevention UX):** Giao diện Pipeline Kanban và Drawer vẫn cho phép kéo thả hoặc click vào tất cả các nút stage mà không hề đối chiếu với máy trạng thái (state machine).
  2. **Raw JSON Leakage:** Khi backend trả về HTTP 400, giao diện hiển thị thông báo lỗi thô dạng chuỗi JSON `{"statusCode": 400, "code": "APPLICATION_INVALID_STAGE_TRANSITION", ...}` mà không thông qua từ điển bản địa hóa đa ngôn ngữ (i18n).
  3. **Không đồng bộ trạng thái (Out of Sync):** UI không kích hoạt cơ chế `refetch` / `queryClient.invalidateQueries`, dẫn tới trạng thái Kanban trên màn hình bị lệch so với dữ liệu thực tế trong CSDL.

### 1.2 Phạm vi Sửa đổi (Fix Scope)
* **Single Source of Truth:** Import và dùng trực tiếp ma trận `VALID_APPLICATION_STAGE_TRANSITIONS` từ `@haihire/shared`.
* **Centralized State Machine Guard:** Xây dựng hàm kiểm tra tập trung `canTransition(from, to): boolean` và `getTransitionDisabledReason(from, to, t): string` tại `frontend/src/lib/stages.ts`.
* **Component Hóa & Phòng ngừa UX (A3 & A4):**
  - Tạo mới component `StageSelector` (`frontend/src/components/jobs/pipeline/stage-selector.tsx`) hỗ trợ cả 2 variant: `dropdown` (lọc bỏ các stage không hợp lệ) và `buttons` (disable các nút vi phạm kèm tooltip giải thích lý do, ví dụ: *"Không thể chuyển từ SCREENING sang APPLIED"* hoặc *"Ứng viên đã HIRED không thể quay lại APPLIED"*).
  - Tích hợp HTML5 Drag & Drop vào `PipelineCandidateCard` và `PipelineStageSelector`: Kiểm tra `canTransition` trước khi gọi API. Nếu vi phạm, lập tức chặn gọi mạng và hiển thị toast cảnh báo.
* **Xử lý Lỗi Tầng Sâu (Defense-in-Depth):**
  - Toàn bộ 4 vị trí gọi API `updateStage` trong toàn bộ frontend được refactor: Bắt buộc đi qua `getApiErrorMessage(err, t)` để trích xuất thông điệp chuẩn i18n, đồng thời gọi `queryClient.invalidateQueries` để đồng bộ lại dữ liệu CSDL ngay lập tức.
  - Tích hợp `<Toaster richColors position="top-right" />` từ `sonner` vào `RootLayout` (`frontend/src/app/layout.tsx`).
* **Bảo toàn Ràng buộc:** Tuyệt đối không thay đổi backend logic (backend đã hoàn hảo từ Phase 3).

### 1.3 Test Count & Quality Gate Trước / Sau
| Tiêu chí | Trước Phase 12 | Sau Phase 12 | Biến thiên |
| :--- | :---: | :---: | :---: |
| **Backend Test Suite** | 218 tests (25 files) | 218 tests (25 files) | Giữ nguyên (100% PASS) |
| **Frontend Test Suite** | 107 tests (21 files) | **126 tests** (23 files) | **+19 tests mới** (100% PASS) |
| **Tổng số Unit/Integration Tests** | **325 tests** | **344 tests** | **+19 tests (Vượt ngưỡng $\ge 325$)** |
| **DtoPipe CI Gate** | 100% pass | 100% pass | 0 regression |
| **TypeScript Typecheck** | 0 error | 0 error | 0 error |
| **Monorepo ESLint** | 0 error | 0 error | 0 error |

---

## 2. PART A: Phòng ngừa ở Frontend (Prevention)

### 2.1 Single Source of Truth & Helper Functions
Toàn bộ logic máy trạng thái chuyển tuyển dụng được tham chiếu trực tiếp từ package `@haihire/shared`:

```typescript
// frontend/src/lib/stages.ts
import {
  ApplicationStage,
  VALID_APPLICATION_STAGE_TRANSITIONS,
} from "@haihire/shared";

/**
 * Check whether an application stage transition is valid according to the ATS state machine.
 */
export function canTransition(
  from?: ApplicationStage | string | null,
  to?: ApplicationStage | string | null,
): boolean {
  if (!from || !to) return false;
  if (from === to) return true;
  const allowed = VALID_APPLICATION_STAGE_TRANSITIONS[from as ApplicationStage];
  return allowed ? allowed.includes(to as ApplicationStage) : false;
}

/**
 * Get human-readable localized reason why an application stage transition is disabled.
 */
export function getTransitionDisabledReason(
  from?: ApplicationStage | string | null,
  to?: ApplicationStage | string | null,
  t?: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (!from || !to || from === to) return "";
  const fromStage = from as ApplicationStage;
  const toStage = to as ApplicationStage;

  if (fromStage === "HIRED") {
    if (t) {
      try {
        const msg = t("pipeline.tooltips.cannotMoveHired", { from: fromStage, to: toStage });
        if (msg && msg !== "pipeline.tooltips.cannotMoveHired") return msg;
      } catch { /* Fallback */ }
    }
    return `Ứng viên đã HIRED không thể quay lại ${toStage}`;
  }

  if (fromStage === "REJECTED") {
    if (t) {
      try {
        const msg = t("pipeline.tooltips.cannotMoveRejected", { from: fromStage, to: toStage });
        if (msg && msg !== "pipeline.tooltips.cannotMoveRejected") return msg;
      } catch { /* Fallback */ }
    }
    return `Ứng viên đã REJECTED không thể chuyển sang ${toStage}`;
  }

  if (t) {
    try {
      const msg = t("pipeline.tooltips.invalidTransition", { from: fromStage, to: toStage });
      if (msg && msg !== "pipeline.tooltips.invalidTransition") return msg;
    } catch { /* Fallback */ }
  }
  return `Không thể chuyển từ ${fromStage} sang ${toStage}`;
}
```

### 2.2 Component Hóa `StageSelector` Đa Năng
File mới: `frontend/src/components/jobs/pipeline/stage-selector.tsx`
- **Variant `dropdown`:** Tự động loại bỏ hoàn toàn các stage không hợp lệ khỏi menu chọn lựa (`<select>`). Khi ứng viên đang ở `SCREENING`, dropdown chỉ hiển thị `INTERVIEW` và `REJECTED`, tuyệt đối không có `APPLIED`.
- **Variant `buttons`:** Render đầy đủ các stage khác, nhưng các stage không hợp lệ bị vô hiệu hóa (`disabled`), đổi màu xám mờ (`opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800`), đồng thời gắn `title` chứa lý do chi tiết để hiển thị khi người dùng rê chuột (Hover Tooltip).

```tsx
// frontend/src/components/jobs/pipeline/stage-selector.tsx (Trích đoạn nút bấm)
return (
  <div className={`flex items-center gap-2 flex-wrap ${className}`}>
    {stageOptions
      .filter((stage) => !stage.isCurrent)
      .map((stage) => {
        const isButtonDisabled = disabled || isLoading || !stage.allowed;
        return (
          <button
            key={stage.id}
            type="button"
            disabled={isButtonDisabled}
            title={stage.reason || stage.actionLabel}
            onClick={() => handleStageClick(stage.id)}
            className={`h-8 px-3.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors ${
              stage.allowed
                ? `${stage.btnBg} ${stage.btnHover} text-white cursor-pointer disabled:opacity-50`
                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed opacity-50 shadow-none border border-slate-200 dark:border-slate-800"
            }`}
          >
            <span>{stage.actionLabel}</span>
            <span className="h-4 w-4 rounded-full text-[10px] flex items-center justify-center">
              {stage.stepNumber}
            </span>
          </button>
        );
      })}
  </div>
);
```

### 2.3 HTML5 Kanban Drag & Drop Prevention
Tích hợp trực tiếp sự kiện kéo thả giữa `PipelineCandidateCard` và `PipelineStageSelector`:
* Trong `PipelineCandidateCard`: Thiết lập `draggable={canDrag}` và truyền metadata `{ id, stage }` qua `dataTransfer`.
* Trong `PipelineStageSelector`: Thiết lập `onDragOver` và `onDrop` trên từng pill stage.
* Trong `page.tsx` (`handleDropCandidate`):
  ```typescript
  const handleDropCandidate = (
    candidateId: string,
    fromStage: ApplicationStage,
    toStage: ApplicationStage,
  ) => {
    if (fromStage === toStage) return;
    // Chặn trước khi gọi API
    if (!canTransition(fromStage, toStage)) {
      const reason = getTransitionDisabledReason(fromStage, toStage, t);
      toast.error(reason);
      return;
    }
    handleMoveCandidateStage(toStage, candidateId);
  };
  ```

---

## 3. PART B: Error Handling (Defense in Depth)

### 3.1 Grep Kết quả Toàn bộ Vị trí Gọi `updateStage`
Kết quả rà soát toàn bộ frontend xác định chính xác 4 vị trí kích hoạt cập nhật stage:
1. `frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx` (Dòng 380 - Kanban Pipeline Page)
2. `frontend/src/components/applications/applications-data-table.tsx` (Dòng 434 - Drawer danh sách hồ sơ)
3. `frontend/src/app/dashboard/applications/[id]/page.tsx` (Dòng 198 - Trang chi tiết ứng viên)
4. `frontend/src/components/interviews/schedule-interview-modal.tsx` (Dòng 210 - Modal xếp lịch phỏng vấn)

### 3.2 Refactor Chuẩn Hóa Qua `getApiErrorMessage` & Refresh State
Không có bất kỳ vị trí nào sử dụng `JSON.stringify(err)` hoặc in thô `err.message`. Mọi lỗi phát sinh đều được dẫn xuất qua `getApiErrorMessage(err, t)` để hiển thị Toast thông điệp thân thiện và tự động đồng bộ lại cache của TanStack Query:

```typescript
// Refactored handleMoveCandidateStage in page.tsx
const handleMoveCandidateStage = async (
  newStage: ApplicationStage,
  overrideCandidateId?: string,
) => {
  const activeAppId = overrideCandidateId || selectedCandidate?.id;
  const candidate = jobApplications.find((a) => a.id === activeAppId) || selectedCandidate;
  if (!candidate) return;

  // 1. Client-side prevention guard
  if (!canTransition(candidate.stage, newStage)) {
    const reason = getTransitionDisabledReason(candidate.stage, newStage, t);
    toast.error(reason);
    return;
  }

  try {
    await updateStageMutation.mutateAsync({
      id: candidate.id,
      stage: newStage,
    });
    setSelectedStage(newStage);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("stage", newStage);
    newParams.set("applicationId", candidate.id);
    router.replace(`/dashboard/jobs/${jobId}/pipeline?${newParams.toString()}`, {
      scroll: false,
    });
  } catch (err) {
    console.error("Failed to move candidate stage", err);
    // 2. Defense-in-depth: getApiErrorMessage -> localized i18n
    const errorMsg = getApiErrorMessage(err, t);
    toast.error(errorMsg);
    // 3. State sync: refresh TanStack query cache
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    queryClient.invalidateQueries({ queryKey: ["job-applications", jobId] });
  }
};
```

### 3.3 Khai báo Đa ngôn ngữ (i18n Verification)
Hai mã lỗi và bộ tooltip đã được xác minh đầy đủ trong cả 2 từ điển `vi.ts` và `en.ts`:
* `errors.APPLICATION_INVALID_STAGE_TRANSITION`:
  - **vi:** *"Không thể chuyển hồ sơ sang giai đoạn này. Vui lòng kiểm tra lại quy trình tuyển dụng."*
  - **en:** *"This stage transition is not allowed. Please check the recruitment workflow."*
* `errors.APPLICATION_STAGE_CONFLICT`:
  - **vi:** *"Hồ sơ ứng viên vừa được cập nhật bởi một người dùng khác. Vui lòng tải lại trang để xem trạng thái mới nhất."*
  - **en:** *"This application was just updated by another user. Please refresh to see the latest status."*
* `pipeline.tooltips.*`:
  - `invalidTransition`: *"Không thể chuyển từ {from} sang {to}"* / *"Cannot transition from {from} to {to}"*
  - `cannotMoveHired`: *"Ứng viên đã HIRED không thể quay lại {to}"* / *"Candidate is HIRED and cannot transition to {to}"*
  - `cannotMoveRejected`: *"Ứng viên đã REJECTED không thể chuyển sang {to}"* / *"Candidate is REJECTED and cannot transition to {to}"*
  - `dragNotAllowed`: *"Không thể kéo ứng viên sang giai đoạn này"* / *"Cannot drag candidate to this stage"*

---

## 4. PART C: Kiểm chứng & Bằng chứng (Evidence)

### 4.1 Unit Test cho `canTransition` (C1)
Tập tin: `frontend/src/lib/stages.spec.ts` (10 tests pass 100%)
* `APPLIED` $\rightarrow$ `SCREENING`: `true` (Hợp lệ)
* `APPLIED` $\rightarrow$ `HIRED`: `false` (Bị chặn: không được nhảy cóc)
* `SCREENING` $\rightarrow$ `APPLIED`: `false` (Bị chặn: không được đi lùi - Bug gốc)
* `HIRED` $\rightarrow$ `APPLIED`: `false` (Bị chặn: trạng thái kết thúc terminal)
* `REJECTED` $\rightarrow$ `OFFER`: `false` (Bị chặn: trạng thái kết thúc terminal)
* `APPLIED` $\rightarrow$ `APPLIED`: `true` (No-op cùng trạng thái)
* `null` / `undefined`: `false` (Fail-safe)
* `getTransitionDisabledReason`: Trả về thông điệp chi tiết chính xác.

### 4.2 Component Test cho `StageSelector` (C2)
Tập tin: `frontend/src/components/jobs/pipeline/stage-selector.spec.tsx` (5 tests pass 100%)
* Khi `currentStage === "SCREENING"`: Menu dropdown không chứa tùy chọn `APPLIED`.
* Nhấp vào tùy chọn hợp lệ (`INTERVIEW`): Gọi `onSelectStage("INTERVIEW")`.
* Variant buttons: Nút `APPLIED` bị `disabled`, có tooltip `title="Không thể chuyển từ SCREENING sang APPLIED"`, click vào không hề gọi callback.
* Khi ứng viên ở stage `HIRED`: Toàn bộ các nút stage bị vô hiệu hóa với tooltip tương ứng.

### 4.3 Component Test cho Kanban Drag & Drop (C3)
Tập tin: `frontend/src/components/jobs/pipeline/pipeline-drag-drop.spec.tsx` (3 tests pass 100%)
* Kéo `APPLIED` $\rightarrow$ `SCREENING`: Thao tác hợp lệ, API được gọi với `{ candidateId, toStage: "SCREENING" }`, không có toast lỗi.
* Kéo `SCREENING` $\rightarrow$ `APPLIED`: Thao tác vi phạm, API **KHÔNG** được gọi, Toast cảnh báo hiển thị chính xác *"Không thể chuyển từ SCREENING sang APPLIED"*.
* Kéo `HIRED` $\rightarrow$ `APPLIED`: Thao tác vi phạm terminal, API **KHÔNG** được gọi, Toast cảnh báo hiển thị *"Ứng viên đã HIRED..."*.

### 4.4 Kết quả Chạy Toàn bộ Test Suite
```text
backend test:  Test Files  25 passed (25)
backend test:       Tests  218 passed (218)
backend test:    Duration  27.97s

frontend test: Test Files  23 passed (23)
frontend test:      Tests  126 passed (126)
frontend test:   Duration  28.24s

TOTAL: 48 test files, 344 passed tests, 0 failed.
```

---

## 5. BONUS: Bài học Quy trình (Process Improvement)

### 5.1 Nguyên nhân Gốc rễ của Bug
Vấn đề này xuất hiện do **INTEGRATION GAP**: Trong Phase 3, backend đã cài đặt state machine guard rất chặt chẽ, nhưng frontend chưa được bổ sung lớp phòng ngừa tương ứng tại cùng thời điểm, dẫn tới tình trạng người dùng vẫn có thể tương tác với các hành động không hợp lệ và nhận về mã lỗi HTTP 400.

### 5.2 Đề xuất Cải tiến Quy trình (CI Gate Chặn Merge)
Mọi thay đổi liên quan đến API contract hoặc State Machine trong tương lai bắt buộc phải tuân thủ quy trình khép kín:
1. **Shared Contract:** Khai báo kiểu dữ liệu, hằng số chuyển trạng thái và mã lỗi trong `@haihire/shared`.
2. **Backend Enforcement:** Cài đặt guard kiểm tra tại service backend, throw `AppBadRequestException` kèm mã lỗi chuẩn.
3. **Frontend Alignment:** Nhúng helper kiểm tra trạng thái ngay tại UI để ngăn chặn trước khi người dùng gửi request (Disable buttons, lọc options, hiển thị tooltip giải thích).
4. **Full-stack Integration Tests:** Bắt buộc có test cả 2 phía: Unit test backend chặn request vi phạm, Component test frontend ngăn chặn người dùng bấm thao tác.
5. **i18n Coverage:** Bổ sung chuỗi song ngữ vào `vi.ts` và `en.ts` trước khi hoàn tất commit.

---

## 6. Sign-Off

* [x] **Bug đã được khắc phục hoàn toàn:** Không còn khả năng kéo/bấm chuyển từ `SCREENING` về `APPLIED` ở UI.
* [x] **Không có Raw JSON:** Mọi lỗi nếu xảy ra ở tầng mạng đều được định dạng qua i18n và hiển thị dưới dạng Toast đẹp mắt.
* [x] **Đồng bộ trạng thái:** Luôn làm mới TanStack query cache khi xảy ra lỗi để giữ UI và CSDL nhất quán.
* [x] **Test suite tăng trưởng:** Đạt **344 passed tests** (tăng +19 test so với baseline 325).
* [x] **Không regression:** Backend giữ nguyên 218 test pass, DtoPipe CI Gate đạt 100%, linter 0 error, TypeScript 0 error.
* [x] **Hệ thống sẵn sàng vận hành sản xuất.**
