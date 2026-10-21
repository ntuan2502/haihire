# Báo Cáo Thẩm Định Kỹ Thuật Trước Fix P0: URL Format & Error Handling Audit (Wave 5.3)

**Ngày lập**: 2026-10-20T15:06:00+07:00  
**Tác giả**: Antigravity (AI Senior Frontend Architect & Technical Reviewer)  
**Tài liệu liên quan**:

- [`docs/reports/84-task-47-phase-2-wave-5.3-candidate-drawer-report.md`](./84-task-47-phase-2-wave-5.3-candidate-drawer-report.md)
- [`docs/reports/85-task-47-wave-5.3-deepseek-audit-report.md`](./85-task-47-wave-5.3-deepseek-audit-report.md)
- [`docs/reports/86-task-47-wave-5.3-deepseek-clarifications-report.md`](./86-task-47-wave-5.3-deepseek-clarifications-report.md)  
  **Mục tiêu**: Thẩm định chính xác định dạng URL của endpoint download tài liệu ứng viên và rà soát cơ chế `try/catch` / thông báo lỗi trên toàn bộ 5 vị trí gọi `downloadAuthenticatedFile` trước khi tiến hành viết code fix cho 3 lỗi P0.

---

## 1. URL Format Cho Endpoint `/candidates/:id/documents/download`

Đối chiếu trực tiếp mã nguồn tại Caller #2 ([`frontend/src/app/dashboard/candidates/[id]/hooks/use-candidate-document-actions.ts:57–78`](../../frontend/src/app/dashboard/candidates/[id]/hooks/use-candidate-document-actions.ts#L57-L78)):

### a) Đoạn Code Xây Dựng URL Nguyên Bản (Verbatim):

```ts
const handleDownloadDoc = async (
  url: string,
  filename?: string,
  appId?: string,
) => {
  const rawFileName = filename || "document.pdf";
  const downloadFileName = fixUtf8String(rawFileName);
  const queryParams = new URLSearchParams();
  if (url) queryParams.set("url", url);
  if (downloadFileName) queryParams.set("name", downloadFileName);
  const queryString = queryParams.toString()
    ? `?${queryParams.toString()}`
    : "";

  const downloadPath = appId
    ? `/applications/${appId}/documents/download${queryString}`
    : candidate
      ? `/candidates/${candidate.id}/documents/download${queryString}`
      : getDocumentUrl(url);

  await downloadAuthenticatedFile(downloadPath, downloadFileName);
};
```

### b) Phân Tích Định Dạng URL:

- **Base Endpoint**: `/candidates/${candidate.id}/documents/download` (hoặc `/applications/${appId}/documents/download` nếu có `appId`).
- **Query Parameter `url`**: Truyền nguyên chuỗi URL tài liệu đang lưu trong database (ví dụ: `https://minio.../haihire-resumes/tenants/org-1/resumes/my-resume.pdf` hoặc `/haihire-resumes/...`).
- **Query Parameter `name`**: Tên hiển thị của file sau khi đã qua xử lý chuẩn hóa ký tự `fixUtf8String`.
- **Cơ chế xử lý phía Backend**:  
  Tại [`backend/src/minio/minio.service.ts:125–149`](../../backend/src/minio/minio.service.ts#L125-L149), hàm `minioService.extractObjectName(targetUrl)` có cơ chế tự thích ứng rất cao:
  - Nếu là Full URL HTTP/HTTPS: tự parse lấy `pathname`.
  - Chuẩn hóa dấu gạch chéo Unix/Windows.
  - Tự động cắt bỏ tiền tố bucket `haihire-resumes/` nếu có.
  - Ngăn chặn triệt để path traversal `..`.
  - So khớp an toàn với tập `allowedUrls` của ứng viên.

→ **Kết luận**: `CandidateDrawer` (Caller #1) sẽ áp dụng **chính xác 100% mẫu hình này** trong `use-candidate-drawer-state.ts`. Không có blocker.

---

## 2. Bảng Kiểm Toán `try/catch` & `toast.error` Trên Cả 5 Callers

Kết quả rà soát thực tế tại 5 vị trí gọi [`downloadAuthenticatedFile`](../../frontend/src/lib/api/client.ts#L47-L75):

| #     | Vị trí Caller (File & Dòng)                                                                                                                                                                               | Có `try/catch`? | Có `toast.error`? | Trạng thái hiện tại |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------: | :---------------: | ------------------- |
| **1** | [`frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts:145`](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L145)                                       |  ❌ **KHÔNG**   |   ❌ **KHÔNG**    | Gọi hàm trực tiếp   |
| **2** | [`frontend/src/app/dashboard/candidates/[id]/hooks/use-candidate-document-actions.ts:77`](../../frontend/src/app/dashboard/candidates/[id]/hooks/use-candidate-document-actions.ts#L77)                   |  ❌ **KHÔNG**   |   ❌ **KHÔNG**    | Gọi hàm trực tiếp   |
| **3** | [`frontend/src/app/dashboard/applications/[id]/hooks/use-application-stage-actions.ts:126`](../../frontend/src/app/dashboard/applications/[id]/hooks/use-application-stage-actions.ts#L126)               |  ❌ **KHÔNG**   |   ❌ **KHÔNG**    | Gọi hàm trực tiếp   |
| **4** | [`frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx:517`](../../frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx#L517)                                                                         |  ❌ **KHÔNG**   |   ❌ **KHÔNG**    | Gọi hàm trực tiếp   |
| **5** | [`frontend/src/components/applications/applications-data-table/hooks/use-candidate-drawer.ts:181`](../../frontend/src/components/applications/applications-data-table/hooks/use-candidate-drawer.ts#L181) |  ❌ **KHÔNG**   |   ❌ **KHÔNG**    | Gọi hàm trực tiếp   |

---

### Dẫn Chứng Code Tại 5 Callers:

1. **Caller 1 ([`use-candidate-drawer-state.ts:135–146`](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L135-L146))**:

   ```ts
   const handleDownloadDoc = async (
     docUrl: string,
     docName: string,
     appId?: string,
   ) => {
     const cleanName = fixUtf8String(docName || "document.pdf");
     const downloadEndpoint = appId
       ? `/applications/${appId}/documents/download?url=${encodeURIComponent(docUrl)}&fileName=${encodeURIComponent(cleanName)}`
       : getDocumentUrl(docUrl);

     await downloadAuthenticatedFile(downloadEndpoint, cleanName);
   };
   ```

2. **Caller 2 ([`use-candidate-document-actions.ts:71–78`](../../frontend/src/app/dashboard/candidates/[id]/hooks/use-candidate-document-actions.ts#L71-L78))**:

   ```ts
   const downloadPath = appId
     ? `/applications/${appId}/documents/download${queryString}`
     : candidate
       ? `/candidates/${candidate.id}/documents/download${queryString}`
       : getDocumentUrl(url);

   await downloadAuthenticatedFile(downloadPath, downloadFileName);
   ```

3. **Caller 3 ([`use-application-stage-actions.ts:121–127`](../../frontend/src/app/dashboard/applications/[id]/hooks/use-application-stage-actions.ts#L121-L127))**:

   ```ts
   const activeAppId = targetAppId || app?.id;
   const downloadPath = activeAppId
     ? `/applications/${activeAppId}/documents/download${queryString}`
     : url;

   await downloadAuthenticatedFile(downloadPath, downloadFileName);
   ```

4. **Caller 4 ([`pipeline/page.tsx:512–518`](../../frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx#L512-L518))**:

   ```ts
   const activeAppId = targetAppId || selectedCandidate?.id;
   const downloadPath = activeAppId
     ? `/applications/${activeAppId}/documents/download${queryString}`
     : url;

   await downloadAuthenticatedFile(downloadPath, downloadFileName);
   ```

5. **Caller 5 ([`use-candidate-drawer.ts:176–182`](../../frontend/src/components/applications/applications-data-table/hooks/use-candidate-drawer.ts#L176-L182))**:
   ```ts
   const activeAppId = targetAppId || selectedApp?.id;
   const downloadPath = activeAppId
     ? `/applications/${activeAppId}/documents/download${queryString}`
     : url;

   await downloadAuthenticatedFile(downloadPath, downloadFileName);
   ```

---

## 3. Phân Tích Rủi Ro & Chiến Lược Khắc Phục (Architectural Resolution)

### Tại sao cả 5 callers đều thiếu `try/catch`?

Bởi vì hàm [`downloadAuthenticatedFile`](../../frontend/src/lib/api/client.ts#L47-L75) trước đây đã có một khối `catch` bên trong để nuốt mọi lỗi:

```ts
  } catch {
    const baseUrl = getApiBaseUrl();
    const fallbackUrl = downloadPath.startsWith("http")
      ? downloadPath
      : `${baseUrl.replace(/\/+$/, "")}${downloadPath.startsWith("/") ? "" : "/"}${downloadPath}`;
    const a = document.createElement("a");
    a.href = fallbackUrl;
    a.download = cleanFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
```

Khối `catch` này biến mọi lỗi HTTP (401 token hết hạn, 403 không có quyền, 500 lỗi máy chủ) thành một lần kích hoạt tải file trực tiếp, làm trình duyệt tải về file nhị phân chứa chuỗi JSON báo lỗi thay vì quăng exception. Do hàm không bao giờ `throw`, các callers đã không cài đặt `try/catch`.

### Nguy cơ Unhandled Promise Rejection:

Nếu sửa `downloadAuthenticatedFile` thành hàm quăng lỗi (`throw err`) mà không cập nhật callers, thì **cả 5 callers trên đều sẽ bị unhandled promise rejection** khi xảy ra lỗi mạng hoặc hết hạn phiên làm việc.

### Phương án giải quyết tối ưu (Phòng thủ đa tầng):

1. **Tại `downloadAuthenticatedFile` ([`client.ts`](../../frontend/src/lib/api/client.ts#L47))**:
   - Loại bỏ fallback tạo thẻ `<a>` tải file rác khi API trả về lỗi status >= 400.
   - Thêm xử lý hiển thị toast thông báo lỗi mặc định (sử dụng `toast.error(getApiErrorMessage(err, t))`) hoặc dispatch lỗi có kiểm soát.
   - Quăng lỗi (`throw err`) có định dạng chuẩn để các caller có thể bắt nếu muốn custom logic.
2. **Tại cả 5 Callers**:
   - Bổ sung cấu trúc `try { await downloadAuthenticatedFile(...) } catch (err) { ... }` và tích hợp `toast.error(getApiErrorMessage(err, t))` tại từng caller.

→ **Kết luận**: Cần bọc `try/catch` và `toast.error` đồng bộ cho cả 5 callers khi triển khai fix P0-1a. Không có blocker.

---

## 4. Kế Hoạch Triển Khai Chi Tiết (Wave 5.3 Hotfix Spec)

| Hạng mục Fix                                                  | Files Bị Ảnh Hưởng                                                             | Nội Dung Fix Cụ Thể                                                                                                                              |
| :------------------------------------------------------------ | :----------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fix 1 (P0): Khắc phục Stale UI khi hủy phỏng vấn**          | `frontend/src/hooks/use-interview-queries.ts`                                  | Bổ sung `queryClient.invalidateQueries({ queryKey: ["candidates"] })` vào cả `onSuccess` và `onError` của `useDeleteInterviewMutation`.          |
| **Fix 2 (P0): Tenant Guard khi tải resume ứng viên**          | `frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts`      | Cập nhật logic `handleDownloadDoc`: khi không có `appId`, gọi endpoint bảo vệ `/candidates/${candidate.id}/documents/download?url=...&name=...`. |
| **Fix 3 (P0): Chống nuốt lỗi download & Unhandled Rejection** | `frontend/src/lib/api/client.ts` và cả 5 callers                               | Loại bỏ fallback nuốt lỗi trong `downloadAuthenticatedFile`; bọc `try/catch` + `toast.error` tại cả 5 callers.                                   |
| **Fix 4 (P1): Tăng cường bảo mật Iframe preview**             | `frontend/src/components/candidates/drawer/candidate-drawer-documents-tab.tsx` | Bổ sung thuộc tính `sandbox="allow-scripts allow-same-origin"` và `referrerPolicy="no-referrer"` vào thẻ `<iframe>`.                             |
| **Fix 5 (P2): Bổ sung unit tests cho các edge cases**         | `frontend/src/components/candidates/candidate-drawer.spec.tsx`                 | Bổ sung tests kiểm thử: đóng modal xóa khi click "Hủy", tải tài liệu lỗi, và tự thoát preview khi xóa file.                                      |
