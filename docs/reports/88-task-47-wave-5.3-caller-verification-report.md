# Báo Cáo Kỹ Thuật: Thẩm Định 2 Điểm Không Nhất Quán Giữa Các Callers (Wave 5.3)

**Ngày lập**: 2026-10-20T15:11:00+07:00  
**Tác giả**: Antigravity (AI Senior Frontend Architect & Technical Reviewer)  
**Tài liệu liên quan**:

- [`docs/reports/84-task-47-phase-2-wave-5.3-candidate-drawer-report.md`](./84-task-47-phase-2-wave-5.3-candidate-drawer-report.md)
- [`docs/reports/85-task-47-wave-5.3-deepseek-audit-report.md`](./85-task-47-wave-5.3-deepseek-audit-report.md)
- [`docs/reports/86-task-47-wave-5.3-deepseek-clarifications-report.md`](./86-task-47-wave-5.3-deepseek-clarifications-report.md)
- [`docs/reports/87-task-47-wave-5.3-p0-audit-verification-report.md`](./87-task-47-wave-5.3-p0-audit-verification-report.md)  
  **Mục tiêu**: Thẩm định thực tế mã nguồn về tính đúng đắn của Caller #4 trên Pipeline Kanban và sự không nhất quán query param (`fileName=` vs `name=`) tại Caller #1 trước khi chốt spec implement.

---

## 1. Thẩm Định Caller #4 (`pipeline/page.tsx`)

### a) Trích xuất nguyên văn mã nguồn (Dòng 512–518):

File: [`frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx:512–518`](../../frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx#L512-L518):

```ts
512:     const activeAppId = targetAppId || selectedCandidate?.id;
513:     const downloadPath = activeAppId
514:       ? `/applications/${activeAppId}/documents/download${queryString}`
515:       : url;
516:
517:     await downloadAuthenticatedFile(downloadPath, downloadFileName);
518:   };
```

### b) Xác nhận tên biến:

Biến thứ 2 trong toán tử `||` chính xác là: **`selectedCandidate?.id`**.

### c) Phân tích thực tế kiểu dữ liệu của `selectedCandidate`:

Mặc dù biến được đặt tên là `selectedCandidate`, nhưng bản chất dữ liệu trong mã nguồn như sau:

- Tại [dòng 68–69](../../frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx#L68-L69):
  ```ts
  const { data: jobApplications = [], isLoading: appsLoading } =
    useJobApplications(jobId);
  ```
  `jobApplications` là danh sách các đối tượng mang kiểu dữ liệu **`Application`** (`Application[]`).
- Tại [dòng 321–335](../../frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx#L321-L335):
  ```ts
  const selectedCandidate = useMemo(() => {
    return (
      filteredCandidates.find(...) ||
      jobApplications.find(...) ||
      filteredCandidates[0] ||
      null
    );
  }, [filteredCandidates, jobApplications, selectedAppId]);
  ```
- **Kết luận kiểu dữ liệu**: Biến `selectedCandidate` thực chất lưu trữ một đối tượng **`Application`**.
  - `selectedCandidate.id`: **Chính là Application ID** (`application.id`).
  - `selectedCandidate.candidateId`: Mới là ID của ứng viên (`candidate.id`).
  - Dẫn chứng xác thực: Tại [dòng 486](../../frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx#L486), hàm xóa application gọi `deleteAppMutation.mutateAsync(selectedCandidate.id)`.

### d) Đánh giá rủi ro lỗi 404:

- **KHÔNG BỊ LỖI 404**. Endpoint `/applications/${activeAppId}/documents/download` nhận đúng `activeAppId` là ID của application, nên luồng download hoạt động hoàn toàn chính xác.
- Đây không phải bug logic, mà là **nợ kỹ thuật đặt tên biến (naming debt)** (`selectedCandidate` thay vì `selectedApp`) bên trong God File `pipeline/page.tsx`, sẽ được tái cấu trúc sạch sẽ tại Wave 5.6.

→ **Kết luận**: **Không phải bug production**; Không phát sinh lỗi 404; Không cần fix riêng P0.

---

## 2. Thẩm Định Lệch Tên Param Caller #1 (`fileName=` vs `name=`)

### a) Signature endpoint tại Backend:

File: [`backend/src/applications/applications.controller.ts:137–148`](../../backend/src/applications/applications.controller.ts#L137-L148):

```ts
137:   @Get(":id/documents/download")
138:   @UseGuards(AuthGuard("jwt"))
139:   async downloadDocument(
140:     @Param("id") id: string,
141:     @Query("url") targetUrl: string,
142:     @Query("name") targetName: string,
143:     @Res() res: Response,
144:     @Request()
145:     req: {
146:       user?: { id?: string; name?: string; organizationId?: string | null };
147:     },
148:   )
```

### b) Backend nhận `name` hay `fileName`?

- Backend **CHỈ NHẬN `@Query("name") targetName`** ([dòng 142](../../backend/src/applications/applications.controller.ts#L142)).
- **HOÀN TOÀN KHÔNG CÓ ALIAS** cho `fileName`.

### c) Phân tích tác động tại Caller #1 (`CandidateDrawer`):

- Caller #1 ([`use-candidate-drawer-state.ts:142`](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L142)) hiện truyền:
  ```ts
  /applications/${appId}/documents/download?url=${encodeURIComponent(docUrl)}&fileName=${encodeURIComponent(cleanName)}
  ```
- Do gửi param `fileName` thay vì `name`, backend nhận `targetName = undefined`.
- Tại [`backend/src/applications/services/applications-documents.service.ts:169`](../../backend/src/applications/services/applications-documents.service.ts#L169):
  ```ts
  const rawName = targetName || app.resumeFileName || "document.pdf";
  ```
  Vì `targetName` bị `undefined`, backend fallback về tên CV chính (`app.resumeFileName`) hoặc `"document.pdf"`.  
  **Hậu quả**:
  1. Header `Content-Disposition` trả về sai tên file (ví dụ: tải file chứng chỉ `Certificate.pdf` nhưng header response lại mang tên `John_CV.pdf`).
  2. Bảng Activity Audit Log ghi nhận sai tên file tải về (`"Document John_CV.pdf was downloaded"` thay vì `"Certificate.pdf"`).

### d) Tình trạng báo cáo:

- **CHƯA TỪNG ĐƯỢC PHÁT HIỆN HAY BÁO CÁO**. Đây là một legacy bug âm thầm tồn tại từ trước refactor (kế thừa từ dòng 182 của God File `candidate-drawer.tsx` cũ).

→ **Kết luận**: **ĐÂY LÀ BUG PRODUCTION CẦN FIX**; Cần được **gộp sửa trực tiếp vào P0-2** bằng cách chuẩn hóa Caller #1 sử dụng `URLSearchParams` với `?url=...&name=...` đồng bộ với 4 callers còn lại.

---

## 3. Tổng Hợp Spec Fix Toàn Diện (Wave 5.3 Hotfix)

| Hạng mục | Vị trí sửa                                                                     | Nội dung kỹ thuật                                                                                                                     |              Mức độ              |
| :------- | :----------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------: |
| **P0-1** | `frontend/src/hooks/use-interview-queries.ts`                                  | Thêm `queryClient.invalidateQueries({ queryKey: ["candidates"] })` vào cả `onSuccess` và `onError` của `useDeleteInterviewMutation`.  |        **P0** (Stale UI)         |
| **P0-2** | `frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts`      | Đổi `&fileName=` thành `&name=`; khi thiếu `appId` chuyển sang gọi `/candidates/${candidate.id}/documents/download?url=...&name=...`. | **P0** (Security & Filename bug) |
| **P0-3** | `frontend/src/lib/api/client.ts` + cả 5 callers                                | Loại bỏ fallback nuốt lỗi 401/403 trong `downloadAuthenticatedFile`; bọc `try/catch` và `toast.error` đồng bộ cho cả 5 callers.       |     **P0** (Error Handling)      |
| **P1**   | `frontend/src/components/candidates/drawer/candidate-drawer-documents-tab.tsx` | Bổ sung `sandbox="allow-scripts allow-same-origin"` và `referrerPolicy="no-referrer"` vào thẻ `<iframe>`.                             | **P1** (Client-side XSS defense) |
