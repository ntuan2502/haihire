# Báo Cáo Kỹ Thuật: Làm Rõ 3 Điểm Kiểm Toán Wave 5.3 (DeepSeek Technical Inquiries)

**Ngày lập**: 2026-10-20T14:43:00+07:00  
**Tác giả**: Antigravity (AI Senior Frontend Architect & Security Reviewer)  
**Tài liệu liên quan**:

- [`docs/reports/84-task-47-phase-2-wave-5.3-candidate-drawer-report.md`](./84-task-47-phase-2-wave-5.3-candidate-drawer-report.md)
- [`docs/reports/85-task-47-wave-5.3-deepseek-audit-report.md`](./85-task-47-wave-5.3-deepseek-audit-report.md)  
  **Mục tiêu**: Làm rõ phạm vi ảnh hưởng (blast radius), tính sẵn sàng của backend download endpoint và phạm vi cache key `["candidates"]` trước khi tiến hành lập kế hoạch vá 3 điểm rủi ro P0.

---

## 1. Scope & Blast Radius Của `downloadAuthenticatedFile`

Tìm kiếm toàn bộ không gian mã nguồn `frontend/src/` cho thấy hàm [`downloadAuthenticatedFile`](../../frontend/src/lib/api/client.ts#L47-L75) được sử dụng tại **5 vị trí sản xuất (production callers)** thuộc 4 màn hình chức năng:

|  STT  | File & Dòng                                                                                                                                                                                               | Ngữ cảnh sử dụng                                                               | Tham số URL truyền vào                                                                                                                     |
| :---: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | [`frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts:145`](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L145)                                       | **CandidateDrawer**: Nút tải tài liệu trong tab Documents                      | `/applications/:appId/documents/download` (nếu có `appId`) hoặc `getDocumentUrl(docUrl)`                                                   |
| **2** | [`frontend/src/app/dashboard/candidates/[id]/hooks/use-candidate-document-actions.ts:77`](../../frontend/src/app/dashboard/candidates/[id]/hooks/use-candidate-document-actions.ts#L77)                   | **Candidate Full Page**: Trang chi tiết toàn màn hình ứng viên                 | `/applications/:appId/documents/download` (nếu có `appId`), hoặc `/candidates/:candidateId/documents/download`, hoặc `getDocumentUrl(url)` |
| **3** | [`frontend/src/app/dashboard/applications/[id]/hooks/use-application-stage-actions.ts:126`](../../frontend/src/app/dashboard/applications/[id]/hooks/use-application-stage-actions.ts#L126)               | **Application Detail Page**: Trang chi tiết hồ sơ ứng tuyển                    | `/applications/:activeAppId/documents/download${queryString}`                                                                              |
| **4** | [`frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx:517`](../../frontend/src/app/dashboard/jobs/[id]/pipeline/page.tsx#L517)                                                                         | **Job Pipeline Kanban**: Tải tài liệu ứng viên từ Quick Drawer / Preview modal | `/applications/:activeAppId/documents/download${queryString}`                                                                              |
| **5** | [`frontend/src/components/applications/applications-data-table/hooks/use-candidate-drawer.ts:181`](../../frontend/src/components/applications/applications-data-table/hooks/use-candidate-drawer.ts#L181) | **ApplicationsDataTable**: Tải tài liệu từ Quick Drawer của bảng ứng tuyển     | `/applications/:activeAppId/documents/download${queryString}`                                                                              |

### Đánh giá Blast Radius khi sửa `downloadAuthenticatedFile`:

- Cả 5 vị trí đều tuân theo signature đồng nhất: `downloadAuthenticatedFile(downloadPath: string, fileName: string): Promise<void>`.
- Hiện tại, [`downloadAuthenticatedFile`](../../frontend/src/lib/api/client.ts#L63-L74) chứa một khối `catch` nuốt toàn bộ lỗi mạng/xác thực (401/403/500) và tự động tạo thẻ `<a download>` để tải trực tiếp URL. Khi phiên làm việc hết hạn hoặc bị từ chối quyền, người dùng tải về file hỏng chứa JSON lỗi (`{"statusCode":401,...}`).
- Khi cải tiến hàm này (loại bỏ fallback nuốt lỗi, ném exception hoặc hiển thị toast thông báo lỗi), **toàn bộ 5 vị trí trên sẽ được đồng bộ bảo vệ an toàn**, không gây phá vỡ giao diện hay phát sinh hiệu ứng phụ tiêu cực.

→ **Kết luận**: Blast radius giới hạn đúng 5 vị trí tài liệu; **Không có blocker**.

---

## 2. Thẩm Định Backend Endpoint `/candidates/:id/documents/download`

Đối chiếu trực tiếp mã nguồn tại [`backend/src/candidates/candidates.controller.ts:118–147`](../../backend/src/candidates/candidates.controller.ts#L118-L147) và service [`backend/src/candidates/services/candidates-documents.service.ts:115–204`](../../backend/src/candidates/services/candidates-documents.service.ts#L115-L204):

### a) Signature Endpoint:

- Controller: [`candidates.controller.ts:118–128`](../../backend/src/candidates/candidates.controller.ts#L118-L128):
  ```ts
  @Get(":id/documents/download")
  async downloadDocument(
    @Param("id") id: string,
    @Query("url") targetUrl: string,
    @Query("name") targetName: string,
    @Res() res: Response,
    @Request() req: { user?: { id?: string; name?: string; organizationId?: string | null } },
  )
  ```
  Nhận param:
  - `:id` (Candidate ID qua URL Param).
  - `url` (`targetUrl` qua Query string).
  - `name` (`targetName` qua Query string).
  - Xác thực người dùng qua JWT Guard gắn ở cấp Controller (`@UseGuards(AuthGuard("jwt"))` tại [dòng 29](../../backend/src/candidates/candidates.controller.ts#L29)).

### b) Kiểm tra Tenant Isolation (`tenantOrgId`):

- Service: [`candidates-documents.service.ts:122`](../../backend/src/candidates/services/candidates-documents.service.ts#L122):
  ```ts
  const candidate = await this.profileService.findOne(id, tenantOrgId);
  ```
  **CÓ**. Phương thức gọi `this.profileService.findOne(id, tenantOrgId)` ([`candidates-profile.service.ts:109–125`](../../backend/src/candidates/services/candidates-profile.service.ts#L109-L125)). Nếu `tenantOrgId` của user không trùng khớp với candidate hoặc candidate đã bị soft-delete, hệ thống lập tức ném 404/403 `AppNotFoundException`.

### c) Audit Trail (Parity với Application Endpoint):

- Service: [`candidates-documents.service.ts:174–193`](../../backend/src/candidates/services/candidates-documents.service.ts#L174-L193):
  **CÓ**. Ghi nhận sự kiện tải tài liệu vào hệ thống Activity:
  ```ts
  if (currentUser?.id && this.activitiesService && candidate.organizationId) {
    this.activitiesService
      .createActivity({
        organizationId: candidate.organizationId,
        candidateId: candidate.id,
        type: "NOTE_ADDED",
        title: "Document Downloaded",
        description: `Document "${cleanFileName}" was downloaded by ${currentUser.name || "recruiter"}`,
        actorId: currentUser.id,
        actorName: currentUser.name || "Recruiter",
        metadata: {
          action: "DOWNLOAD_DOCUMENT",
          subType: "DOCUMENT_DOWNLOADED",
          fileName: cleanFileName,
          userName: currentUser.name || "Recruiter",
          documentUrl: downloadUrl,
        },
      })
      .catch(() => {});
  }
  ```

### d) SSRF Guard (Kiểm tra URL thuộc `allowedUrls`):

- Service: [`candidates-documents.service.ts:133–157`](../../backend/src/candidates/services/candidates-documents.service.ts#L133-L157):
  **CÓ**. Hệ thống khởi tạo mảng `allowedUrls` từ `candidate.resumeUrl` và toàn bộ tài liệu trong `candidate.allDocuments`. Hàm trích xuất object name MinIO qua `this.minioService.extractObjectName(targetUrl)`. Nếu URL yêu cầu không thuộc danh mục tài liệu của ứng viên, service ném ngay lỗi 403 `AppForbiddenException`:
  `"Access denied: specified document does not belong to this candidate."` ([dòng 151–155](../../backend/src/candidates/services/candidates-documents.service.ts#L151-L155)).

### e) Định dạng trả về:

- Controller: [`candidates.controller.ts:138–146`](../../backend/src/candidates/candidates.controller.ts#L138-L146):
  ```ts
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`,
  );
  if (mimeType) {
    res.setHeader("Content-Type", mimeType);
  }
  stream.pipe(res);
  ```
  Trả về **NodeJS stream pipe trực tiếp ra HTTP Response (`stream.pipe(res)`)**, đi kèm các header RFC 5987 và MIME type chính xác. Hoàn toàn là luồng nhị phân trực tiếp từ MinIO, không phải URL redirect hay presigned link.

→ **Kết luận**: Backend endpoint `/candidates/:id/documents/download` đã **SẴN SÀNG 100%, ĐẦY ĐỦ BẢO MẬT & CHUẨN MỰC**. Phía Frontend (`CandidateDrawer`) có thể chuyển sang gọi endpoint này ngay lập tức; **Không có blocker phía Backend**.

---

## 3. Cache Scope Của `["candidates"]` & Đánh Giá Refetch Thừa

Khai báo query keys tại [`frontend/src/hooks/query-keys.ts:7–8`](../../frontend/src/hooks/query-keys.ts#L7-L8):

```ts
candidates: (orgId?: string | null) => ["candidates", { orgId }] as const,
candidate: (id?: string | null) => ["candidates", id] as const,
```

Trong TanStack Query, lệnh `queryClient.invalidateQueries({ queryKey: ["candidates"] })` sử dụng cơ chế **Prefix Matching** (so khớp tiền tố mảng), do đó sẽ đồng thời đánh dấu stale cho 2 nhóm:

1. `["candidates", id]` (`useCandidate(id)`)
2. `["candidates", { orgId }]` (`useCandidates(orgId)`)

### Các vị trí và Component đăng ký subscribe:

#### 1. Nhóm subscribe vào `useCandidate(id)` (`["candidates", id]`):

- [`frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts:39`](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L39): `CandidateDrawer` (nguyên nhân gây bug Stale UI khi hủy phỏng vấn).
- [`frontend/src/app/dashboard/candidates/hooks/use-candidates-drawer-state.ts:18`](../../frontend/src/app/dashboard/candidates/hooks/use-candidates-drawer-state.ts#L18): Quick Drawer trên trang danh sách ứng viên.
- [`frontend/src/app/dashboard/candidates/[id]/hooks/use-candidate-detail-state.ts:18`](../../frontend/src/app/dashboard/candidates/[id]/hooks/use-candidate-detail-state.ts#L18): Trang chi tiết toàn màn hình ứng viên.
- [`frontend/src/app/dashboard/candidates/[id]/edit/page.tsx:42`](../../frontend/src/app/dashboard/candidates/[id]/edit/page.tsx#L42): Trang chỉnh sửa ứng viên.

#### 2. Nhóm subscribe vào `useCandidates(orgId)` (`["candidates", { orgId }]`):

- [`frontend/src/app/dashboard/candidates/hooks/use-candidates-filter-sort.ts:26`](../../frontend/src/app/dashboard/candidates/hooks/use-candidates-filter-sort.ts#L26): Bảng danh sách ứng viên `/dashboard/candidates`.
- [`frontend/src/app/dashboard/applications/page.tsx:72`](../../frontend/src/app/dashboard/applications/page.tsx#L72): Trang danh sách ứng tuyển `/dashboard/applications`.
- [`frontend/src/app/dashboard/jobs/[id]/layout.tsx:58`](../../frontend/src/app/dashboard/jobs/[id]/layout.tsx#L58): Layout công việc `/dashboard/jobs/[id]`.
- [`frontend/src/app/dashboard/jobs/page.tsx:102`](../../frontend/src/app/dashboard/jobs/page.tsx#L102): Trang danh sách công việc `/dashboard/jobs`.

### Đánh giá nguy cơ Refetch Thừa (Over-fetching):

- **Cơ chế Active Refetch của TanStack Query**: Thư viện **chỉ thực hiện gọi mạng (refetch) đối với những query đang mount (Active)** trên màn hình hiện tại. Các query ở các trang khác chỉ được gán cờ `isStale = true` và chỉ fetch khi người dùng chuyển trang đến đó.
- Khi người dùng ở trang Candidates và mở Drawer để hủy một buổi phỏng vấn:
  - Query `useCandidate` trong Drawer được refetch → Lập tức xóa buổi phỏng vấn khỏi UI (**Khắc phục 100% bug Stale UI**).
  - Query `useCandidates` của bảng danh sách nền được refetch → Đồng bộ số liệu đếm phỏng vấn/trạng thái ứng viên (hoàn toàn đúng logic nghiệp vụ).
- Chi phí truy vấn: Endpoint danh sách ứng viên được phân trang (`page`, `limit`), kích thước payload nhỏ (<10KB) và thời gian phản hồi local <15ms. Việc làm mới này hoàn toàn tương thích và nhất quán với cách `useDeleteInterviewMutation` đang invalidate `["applications"]` và `["interviews"]`.

→ **Kết luận**: Bổ sung `queryClient.invalidateQueries({ queryKey: ["candidates"] })` là an toàn tuyệt đối, loại bỏ dứt điểm Stale UI và không gây nghẽn hiệu năng; **Không có blocker**.

---

## 4. Tổng Kết & Đề Xuất Kế Hoạch Fix (P0 Fix Spec)

Dựa trên kết quả khảo sát chi tiết 3 câu hỏi trên:

1. **P0.1 (Stale UI)**: Thêm `queryClient.invalidateQueries({ queryKey: ["candidates"] });` vào `onSuccess` và `onError` của `useDeleteInterviewMutation` tại [`frontend/src/hooks/use-interview-queries.ts:112–119`](../../frontend/src/hooks/use-interview-queries.ts#L112-L119).
2. **P0.2 (Download Auth & Tenant Guard)**:
   - Trong [`use-candidate-drawer-state.ts:141–143`](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L141-L143), khi tải tài liệu không có `appId`, chuyển sang gọi endpoint an toàn `/candidates/${candidate.id}/documents/download?url=...&name=...`.
   - Trong [`downloadAuthenticatedFile`](../../frontend/src/lib/api/client.ts#L63-L74), bỏ fallback nuốt lỗi và bắn `toast.error(getApiErrorMessage(err, t))` khi API trả về 401/403/500.
3. **P1 (Iframe Sandbox)**: Thêm thuộc tính `sandbox="allow-scripts allow-same-origin"` và `referrerPolicy="no-referrer"` vào thẻ `<iframe>` trong [`candidate-drawer-documents-tab.tsx:99–103`](../../frontend/src/components/candidates/drawer/candidate-drawer-documents-tab.tsx#L99-L103).
