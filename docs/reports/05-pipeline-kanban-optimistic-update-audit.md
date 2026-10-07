# BÁO CÁO XÁC MINH KỸ THUẬT #05: KIỂM CHỨNG CƠ CHẾ CẬP NHẬT KANBAN PIPELINE (OPTIMISTIC VS PESSIMISTIC UPDATE)
> **Tài liệu gửi DeepSeek & Chủ Dự Án (Single Source of Truth - Pipeline State Management & Concurrency UX)**  
> **Dự án:** HaiHire Enterprise ATS Platform  
> **Người lập:** Antigravity (Senior Software Engineer / Lead Maintainer)  
> **Thời gian:** 2026-10-07  
> **Mã báo cáo:** `DOCS-REP-05`

---

## MỤC LỤC BÁO CÁO
1. [KẾT LUẬN TỔNG QUAN] Phân loại kiến trúc cập nhật trạng thái Pipeline
2. [PHÂN TÍCH CHI TIẾT DÒNG CODE 380-420 `pipeline/page.tsx`]
3. [KIỂM CHỨNG TẦNG HOOK VÀ QUERY CLIENT] `useUpdateStageMutation`
4. [HÀNH VI KHI XẢY RA LỖI 409 CONFLICT] Thẻ hiển thị và phản ứng ra sao?
5. [ĐÁNH GIÁ ĐÁNH ĐỔI KIẾN TRÚC (TRADE-OFF ANALYSIS)] An toàn vs Trải nghiệm người dùng
6. [TỔNG KẾT & KHUYẾN NGHỊ ĐỒNG HÓA REALTIME]

---

## 1. [KẾT LUẬN TỔNG QUAN]

- **Có Optimistic Update (di chuyển thẻ ngay lập tức trước khi gọi API) không?** **KHÔNG.**
- **Mô hình đang áp dụng:** **Pessimistic Update (Server-Authoritative Pattern)**.
- **Tóm tắt hành vi:**
  - Khi người dùng kéo-thả thẻ ứng viên sang Stage mới (hoặc bấm nút chuyển Stage trong chi tiết), giao diện **KHÔNG tự ý di chuyển thẻ trước**.
  - Client giữ nguyên vị trí thẻ, hiển thị trạng thái `isMovingStage = true` (loading/disabled) và đợi phản hồi HTTP từ server.
  - Chỉ sau khi server trả về `200 OK`, thẻ mới được chuyển sang Stage mới.
  - Nếu gặp lỗi HTTP 409 (`APPLICATION_STAGE_CONFLICT`), thẻ không bao giờ bị hiện tượng giật cục (flicker/revert) vì state chưa từng bị thay đổi giả định; đồng thời TanStack Query tự động refetch để đưa thẻ về đúng trạng thái thực tế nhất trên database.

---

## 2. [PHÂN TÍCH CHI TIẾT DÒNG CODE 380-420 `pipeline/page.tsx`]

Mã nguồn tại [`frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx:L383-420`](file:///c:/Workspaces/haihire/frontend/src/app/dashboard/jobs/%5Bid%5D/pipeline/page.tsx#L383-L420):

```typescript
383:   const handleMoveCandidateStage = async (
384:     newStage: ApplicationStage,
385:     overrideCandidateId?: string,
386:   ) => {
387:     const activeAppId = overrideCandidateId || selectedCandidate?.id;
388:     const candidate = jobApplications.find((a) => a.id === activeAppId) || selectedCandidate;
389:     if (!candidate) return;
390: 
391:     // PART A (A3 Prevention): Enforce state machine transition check before calling API
392:     if (!canTransition(candidate.stage, newStage)) {
393:       const reason = getTransitionDisabledReason(candidate.stage, newStage, t);
394:       toast.error(reason);
395:       return;
396:     }
397: 
398:     try {
399:       await updateStageMutation.mutateAsync({
400:         id: candidate.id,
401:         stage: newStage,
402:       });
403:       setSelectedStage(newStage);
404:       const newParams = new URLSearchParams(searchParams.toString());
405:       newParams.set("stage", newStage);
406:       newParams.set("applicationId", candidate.id);
407:       router.replace(`/dashboard/jobs/${jobId}/pipeline?${newParams.toString()}`, {
408:         scroll: false,
409:       });
410:     } catch (err) {
411:       console.error("Failed to move candidate stage", err);
412:       // PART B (B2 & B4 Defense in Depth): Pass all errors through getApiErrorMessage -> i18n
413:       const errorMsg = getApiErrorMessage(err, t);
414:       toast.error(errorMsg);
415:       // Refresh / sync Kanban queries
416:       queryClient.invalidateQueries({ queryKey: ["applications"] });
417:       queryClient.invalidateQueries({ queryKey: ["job-applications", jobId] });
418:     }
419:   };
```

### Các bằng chứng code chứng minh KHÔNG có Optimistic Update:
1. **Trước dòng `await updateStageMutation.mutateAsync` (Dòng 383-398):**
   - Chỉ có bước kiểm tra chuyển dịch hợp lệ qua máy trạng thái cục bộ `canTransition(candidate.stage, newStage)`.
   - **Không hề có bất kỳ câu lệnh nào can thiệp vào UI state** (không có `setJobApplications`, không có `queryClient.setQueryData`).
2. **Dòng 399:** Lệnh gọi API được `await`. Toàn bộ luồng thực thi bị tạm dừng cho đến khi nhận được phản hồi từ server.
3. **Chỉ khi API thành công (Dòng 403-407):**
   - `setSelectedStage(newStage)` và `router.replace(...)` mới được kích hoạt.
   - Thẻ và danh sách được đồng bộ thông qua query cache của TanStack Query.

---

## 3. [KIỂM CHỨNG TẦNG HOOK VÀ QUERY CLIENT]

Kiểm tra hook `useUpdateStageMutation` tại [`frontend/src/hooks/use-application-queries.ts:L103-120`](file:///c:/Workspaces/haihire/frontend/src/hooks/use-application-queries.ts#L103-L120):

```typescript
export function useUpdateStageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      stage,
      orderIndex,
    }: {
      id: string;
      stage: ApplicationStage;
      orderIndex?: number;
    }) => applicationsApi.updateStage(id, stage, orderIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}
```

- Hook **hoàn toàn không cài đặt callback `onMutate`** (nơi thường dùng để backup previous state và set optimistic data vào cache).
- Hook chỉ khai báo `mutationFn` và `onSuccess`.

---

## 4. [HÀNH VI KHI XẢY RA LỖI 409 CONFLICT]

Khi có 2 Recruiter cùng thao tác trên 1 hồ sơ ứng viên (hoặc server từ chối vì xung đột state `APPLICATION_STAGE_CONFLICT`):

1. `await updateStageMutation.mutateAsync` thất bại và ném lỗi (HTTP 409).
2. Khối lệnh dừng ngay lập tức tại dòng 399 và nhảy vào khối `catch (err)` tại dòng 410.
3. Các lệnh đổi stage (dòng 403-407) **bị bỏ qua hoàn toàn**.
4. **Trạng thái thẻ trên màn hình:**
   - Thẻ vẫn nằm nguyên vẹn ở cột/danh sách ban đầu, không bị "nhảy tạm thời" sang cột mới rồi giật lùi về.
   - Toast hiển thị: *"Hồ sơ ứng viên vừa được cập nhật bởi một người dùng khác. Vui lòng tải lại trang để xem trạng thái mới nhất."* ([`vi.ts:L89`](file:///c:/Workspaces/haihire/frontend/src/i18n/locales/vi.ts#L89)).
   - Dòng 416-417 kích hoạt:
     ```typescript
     queryClient.invalidateQueries({ queryKey: ["applications"] });
     queryClient.invalidateQueries({ queryKey: ["job-applications", jobId] });
     ```
     Lệnh này lập tức kéo state mới nhất từ PostgreSQL về và render thẻ ở đúng cột mà người dùng trước đó đã cập nhật.

---

## 5. [ĐÁNH GIÁ ĐÁNH ĐỔI KIẾN TRÚC (TRADE-OFF ANALYSIS)]

| Tiêu chí | Optimistic Update | Pessimistic Update (Hiện tại của HaiHire) |
| :--- | :--- | :--- |
| **Cảm giác phản hồi (Perceived Latency)** | Nhanh tức thì (0ms) | Phụ thuộc network (~50 - 150ms) |
| **Độ an toàn dữ liệu** | Rủi ro desync nếu rollback lỗi | **Tuyệt đối an toàn (Single source of truth)** |
| **Trải nghiệm khi Conflict (409)** | Thẻ nhảy sang cột mới rồi giật lùi lại (gây hoang mang cho Recruiter) | **Không bị flicker**, thẻ đứng yên và tự đồng bộ lại |
| **Độ phức tạp code** | Cao (cần lưu snapshot, cancel queries, rollback on error) | **Gọn nhẹ, dễ kiểm thử, không phát sinh race condition client** |

Đối với ứng dụng tuyển dụng doanh nghiệp (Enterprise ATS), việc bảo đảm tính toàn vẹn trạng thái tuyển dụng giữa nhiều thành viên hiring team quan trọng hơn việc tối ưu vài chục mili-giây hiệu ứng kéo thả. Vì vậy cách tiếp cận này là hoàn toàn có chủ đích và an toàn.

---

## 6. [TỔNG KẾT & KHUYẾN NGHỊ ĐỒNG HÓA REALTIME]

1. **Khẳng định:** Thao tác chuyển stage trong `pipeline/page.tsx` là **Pessimistic Update**, an toàn tuyệt đối trước xung đột đồng thời.
2. **Khuyến nghị nâng cấp tương lai:**  
   Để vừa giữ được tính an toàn của Pessimistic Update vừa loại bỏ cảm giác chờ đợi của Recruiter, giải pháp tối ưu là tích hợp **Server-Sent Events (SSE)** hoặc WebSocket vào Kanban Pipeline. Khi Recruiter A chuyển thẻ, Kanban của Recruiter B sẽ tự động di chuyển thẻ trong thời gian thực trước cả khi Recruiter B kịp kéo thẻ đó.
