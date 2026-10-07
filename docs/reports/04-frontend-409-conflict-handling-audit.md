# BÁO CÁO XÁC MINH KỸ THUẬT #04: XỬ LÝ LỖI 409 CONFLICT (STAGE CONFLICT) TRÊN FRONTEND
> **Tài liệu gửi DeepSeek & Chủ Dự Án (Single Source of Truth - Frontend UX & Concurrency Handling)**  
> **Dự án:** HaiHire Enterprise ATS Platform  
> **Người lập:** Antigravity (Senior Software Engineer / Lead Maintainer)  
> **Thời gian:** 2026-10-07  
> **Mã báo cáo:** `DOCS-REP-04`

---

## MỤC LỤC BÁO CÁO
1. [TỔNG QUAN XỬ LÝ 409 TRÊN FRONTEND] Cơ chế ánh xạ mã lỗi qua `getApiErrorMessage`
2. [THÔNG ĐIỆP I18N HIỂN THỊ] Người dùng thấy thông báo gì khi xung đột stage?
3. [CHI TIẾT CÁC MÀN HÌNH GỌI API & HÀNH VI REFETCH]
   - Màn hình 1: Kanban Pipeline Board (`pipeline/page.tsx`)
   - Màn hình 2: Chi tiết hồ sơ ứng viên (`applications/[id]/page.tsx`)
   - Màn hình 3: Bảng danh sách ứng viên (`applications-data-table.tsx`)
   - Màn hình 4: Modal lên lịch phỏng vấn (`schedule-interview-modal.tsx`)
4. [ĐÁNH GIÁ UX AUDIT] Liệu có xảy ra lỗi "thông báo chung chung"?
5. [TỔNG KẾT & KHUYẾN NGHỊ NÂNG CẤP] Action Items cho DeepSeek & Đội ngũ Frontend

---

## 1. [TỔNG QUAN XỬ LÝ 409 TRÊN FRONTEND]

- **Có xử lý error code `APPLICATION_STAGE_CONFLICT` (409) không?** **CÓ.**
- **Cơ chế xử lý:**  
  Khi backend ném ngoại lệ `AppConflictException(APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT)` với HTTP status 409:
  ```json
  {
    "statusCode": 409,
    "code": "APPLICATION_STAGE_CONFLICT",
    "message": "Application stage conflict: the application has been modified by another request. Current stage is no longer 'APPLIED'."
  }
  ```
  Tất cả các lời gọi `updateStage` trên giao diện đều được bọc trong khối `try/catch` và truyền lỗi qua hàm tiện ích chuẩn hóa [`getApiErrorMessage(err, t)`](file:///c:/Workspaces/haihire/frontend/src/lib/api-error.ts#L15-L52) tại [`frontend/src/lib/api-error.ts`](file:///c:/Workspaces/haihire/frontend/src/lib/api-error.ts).
- Hàm này tự động trích xuất `payload.code === "APPLICATION_STAGE_CONFLICT"` và ánh xạ trực tiếp sang key dịch thuật `errors.APPLICATION_STAGE_CONFLICT`.

---

## 2. [THÔNG ĐIỆP I18N HIỂN THỊ] Người dùng thấy gì trên UI?

Hệ thống **KHÔNG hiển thị lỗi chung chung**. Thay vào đó, người dùng nhìn thấy một thông báo lỗi chính xác, mang tính hướng dẫn nghiệp vụ:

### 2.1 Tiếng Việt ([`frontend/src/i18n/locales/vi.ts:L89`](file:///c:/Workspaces/haihire/frontend/src/i18n/locales/vi.ts#L89)):
```typescript
APPLICATION_STAGE_CONFLICT: "Hồ sơ ứng viên vừa được cập nhật bởi một người dùng khác. Vui lòng tải lại trang để xem trạng thái mới nhất.",
```

### 2.2 Tiếng Anh ([`frontend/src/i18n/locales/en.ts:L89`](file:///c:/Workspaces/haihire/frontend/src/i18n/locales/en.ts#L89)):
```typescript
APPLICATION_STAGE_CONFLICT: "This application was just updated by another user. Please refresh to see the latest status.",
```

### 2.3 Kiểm thử đơn vị cho cơ chế dịch lỗi này:
Đã được kiểm chứng trong bộ test tại [`frontend/src/lib/api-error.spec.ts:L90-110`](file:///c:/Workspaces/haihire/frontend/src/lib/api-error.spec.ts#L90-L110) và [`L146-175`](file:///c:/Workspaces/haihire/frontend/src/lib/api-error.spec.ts#L146-L175):
```typescript
it("translates APPLICATION_STAGE_CONFLICT (HTTP 409) with Vietnamese message", async () => { ... });
it("translates APPLICATION_INVALID_STAGE_TRANSITION and APPLICATION_STAGE_CONFLICT in English", async () => { ... });
```

---

## 3. [CHI TIẾT CÁC MÀN HÌNH GỌI API & HÀNH VI REFETCH]

Khảo sát cả 4 vị trí gọi `updateStageMutation.mutateAsync` trong toàn bộ giao diện:

### 3.1 Màn hình 1: Kanban Pipeline Board (Kéo thả stage ứng viên)
- **File:** [`frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx`](file:///c:/Workspaces/haihire/frontend/src/app/dashboard/jobs/%5Bid%5D/pipeline/page.tsx)
- **Vị trí dòng:** [Dòng 410 đến 418](file:///c:/Workspaces/haihire/frontend/src/app/dashboard/jobs/%5Bid%5D/pipeline/page.tsx#L410-L418)
- **Mã nguồn:**
  ```typescript
  } catch (err) {
    console.error("Failed to move candidate stage", err);
    // 1. Hiển thị thông báo toast lỗi cụ thể (409 Conflict)
    const errorMsg = getApiErrorMessage(err, t);
    toast.error(errorMsg);

    // 2. TỰ ĐỘNG REFETCH: Invalidate query để đồng bộ thẻ Kanban về stage mới nhất
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    queryClient.invalidateQueries({ queryKey: ["job-applications", jobId] });
  }
  ```
- **Hành vi UX:** Khi Recruiter kéo thẻ nhưng bị xung đột, toast hiển thị thông báo "Hồ sơ ứng viên vừa được cập nhật bởi một người dùng khác...", đồng thời giao diện **lập tức tự động refetch ngầm** để chuyển thẻ ứng viên về đúng cột trạng thái thực tế mà người khác vừa cập nhật.

---

### 3.2 Màn hình 2: Trang chi tiết hồ sơ ứng viên (Application Detail View)
- **File:** [`frontend/src/app/dashboard/applications/[id]/page.tsx`](file:///c:/Workspaces/haihire/frontend/src/app/dashboard/applications/%5Bid%5D/page.tsx)
- **Vị trí dòng:** [Dòng 213 đến 219](file:///c:/Workspaces/haihire/frontend/src/app/dashboard/applications/%5Bid%5D/page.tsx#L213-L219)
- **Mã nguồn:**
  ```typescript
  } catch (err) {
    console.error("Failed to update stage:", err);
    const errorMsg = getApiErrorMessage(err, t);
    toast.error(errorMsg);

    // TỰ ĐỘNG REFETCH cả danh sách lẫn chi tiết hồ sơ hiện tại
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    queryClient.invalidateQueries({ queryKey: ["application", appIdStr] });
  }
  ```
- **Hành vi UX:** Toast hiển thị thông báo xung đột, giao diện **tự động refetch** lại chi tiết hồ sơ, thanh tiến trình stage tự động nhảy sang trạng thái mới.

---

### 3.3 Màn hình 3: Bảng danh sách ứng viên (Applications Data Table)
- **File:** [`frontend/src/components/applications/applications-data-table.tsx`](file:///c:/Workspaces/haihire/frontend/src/components/applications/applications-data-table.tsx)
- **Vị trí dòng:** [Dòng 446 đến 451](file:///c:/Workspaces/haihire/frontend/src/components/applications/applications-data-table.tsx#L446-L451)
- **Mã nguồn:**
  ```typescript
  } catch (err) {
    console.error("Failed to update stage:", err);
    const errorMsg = getApiErrorMessage(err, t);
    toast.error(errorMsg);

    // TỰ ĐỘNG REFETCH bảng dữ liệu
    queryClient.invalidateQueries({ queryKey: ["applications"] });
  }
  ```
- **Hành vi UX:** Người dùng đổi stage từ dropdown trên table; nếu bị 409 xung đột, toast báo lỗi và table **tự động refetch** lại dòng tương ứng.

---

### 3.4 Màn hình 4: Modal lên lịch phỏng vấn (Schedule Interview Modal)
- **File:** [`frontend/src/components/interviews/schedule-interview-modal.tsx`](file:///c:/Workspaces/haihire/frontend/src/components/interviews/schedule-interview-modal.tsx)
- **Vị trí dòng:** [Dòng 223 đến 226](file:///c:/Workspaces/haihire/frontend/src/components/interviews/schedule-interview-modal.tsx#L223-L226)
- **Mã nguồn:**
  ```typescript
  } catch (err) {
    console.error("Schedule interview failed:", err);
    setFormError(getApiErrorMessage(err, t));
  }
  ```
- **Hành vi UX:** Khi lên lịch phỏng vấn và tự động nhảy stage sang `INTERVIEW`, nếu gặp lỗi 409 xung đột, lỗi hiển thị inline dưới form modal: "Hồ sơ ứng viên vừa được cập nhật bởi một người dùng khác...".  
  *(Điểm lưu ý: Modal này chưa gọi `invalidateQueries` ngay trong catch block, phải đợi đóng modal hoặc màn hình cha cập nhật)*.

---

## 4. [ĐÁNH GIÁ UX AUDIT]

| Tiêu chí | Đánh giá | Chi tiết kiểm chứng |
| :--- | :---: | :--- |
| **Có bị lỗi thông báo chung chung không?** | **KHÔNG** | 100% các màn hình sử dụng `getApiErrorMessage(err, t)`, trích xuất đúng mã `APPLICATION_STAGE_CONFLICT` và hiển thị câu thông báo chuyên biệt giải thích rõ nguyên nhân. |
| **Có tự động Refetch dữ liệu không?** | **CÓ (3/4 màn hình chính)** | Cả 3 màn hình nghiệp vụ chính (Kanban board, Detail view, Data table) đều gọi `queryClient.invalidateQueries(...)` ngay trong khối `catch` để tự động khôi phục giao diện về trạng thái thực của server. |
| **Trải nghiệm kéo thả Kanban:** | **Rất tốt** | Khi kéo thả bị 409, thẻ không bị kẹt ở cột mới mà lập tức được kéo về đúng vị trí thực tế sau khi query invalidate kích hoạt. |

---

## 5. [TỔNG KẾT & KHUYẾN NGHỊ NÂNG CẤP]

### Điểm mạnh:
- Kiến trúc đồng bộ giữa `APP_ERROR_CODES` (backend), `getApiErrorMessage` và dictionary `vi.ts`/`en.ts` hoạt động chuẩn xác, ngăn chặn hoàn toàn lỗi generic toast.
- Khối `catch` ở các màn hình chính đều chủ động invalidates TanStack Query cache.

### Điểm tối ưu đề xuất (Minor Enhancement):
1. **Bổ sung `invalidateQueries` trong hook `useUpdateStageMutation`:**  
   Hiện tại trong [`frontend/src/hooks/use-application-queries.ts:L103-120`](file:///c:/Workspaces/haihire/frontend/src/hooks/use-application-queries.ts#L103-L120), `invalidateQueries` chỉ được cấu hình ở `onSuccess`. Nên bổ sung thêm callback `onError: () => queryClient.invalidateQueries(...)` ngay ở cấp độ Hook gốc. Điều này sẽ đảm bảo **mọi component trong tương lai** dù quên viết `invalidateQueries` trong `catch` block thì TanStack Query vẫn tự động đồng bộ lại dữ liệu.
2. **Nút "Tải lại ngay" trên Toast:**  
   Toast thông báo hiện tại có nội dung *"Vui lòng tải lại trang để xem trạng thái mới nhất"*. Dù dữ liệu ngầm đã được refetch tự động, có thể bổ sung thêm nút hành động `action: { label: "Tải lại", onClick: () => window.location.reload() }` trên sonner toast để người dùng an tâm tuyệt đối.
