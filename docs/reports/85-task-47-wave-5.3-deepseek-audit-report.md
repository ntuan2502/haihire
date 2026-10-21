# Báo Cáo Giải Trình & Đánh Giá Rủi Ro Wave 5.3 (DeepSeek Technical Audit)

**Ngày lập**: 2026-10-20T12:24:00+07:00  
**Đối tượng kiểm toán**: `frontend/src/components/candidates/candidate-drawer.tsx` & Hệ sinh thái liên quan  
**Tác giả**: Antigravity (AI Senior Frontend Architect & Technical Reviewer)  
**Mục tiêu**: Trả lời chính xác 6 câu hỏi kỹ thuật từ DeepSeek dựa trên phân tích trực tiếp mã nguồn, xác định rủi ro và lập lộ trình khắc phục.

---

## 1. Trả Lời Chi Tiết 6 Câu Hỏi Kỹ Thuật

### Câu Hỏi 1 — Container Uncovered Line (`candidate-drawer.tsx:153`)

- **Vị trí và ngữ cảnh code**:  
  File [`frontend/src/components/candidates/candidate-drawer.tsx`](../../frontend/src/components/candidates/candidate-drawer.tsx#L148-L154) (dòng 148–154):
  ```tsx
  148:       <DeleteDocumentModal
  149:         isOpen={!!drawerDocToDelete}
  150:         onClose={() => setDrawerDocToDelete(null)}
  151:         onConfirm={handleConfirmDeleteDrawerDoc}
  152:         isLoading={isDeletingDoc}
  153:       />
  ```
- **Bản chất dòng code**:  
  Đây là **logic thật** — inline callback `onClose={() => setDrawerDocToDelete(null)}` của component [`DeleteDocumentModal`](../../frontend/src/components/candidates/delete-document-modal.tsx). Khi người dùng nhấn nút "Hủy" hoặc đóng dialog, callback này được gọi để reset state `drawerDocToDelete` về `null`, từ đó đóng dialog.
- **Nguyên nhân v8 coverage báo uncovered**:  
  Trong [`frontend/src/components/candidates/candidate-drawer.spec.tsx`](../../frontend/src/components/candidates/candidate-drawer.spec.tsx#L506-L534) (test case 15: _"opens delete document modal and confirms document deletion"_), bài test chỉ thực thi luồng **xác nhận xóa thành công** (`onConfirm`), mà chưa bao quát luồng **hủy bỏ / đóng modal mà không xóa** (`onClose`).
- **Đánh giá & Đề xuất**:  
  Mức độ chấp nhận được ở thời điểm hiện tại (toàn bộ container đã đạt **87.5% line coverage**). Tuy nhiên, cần bổ sung thêm 1 unit test kiểm tra luồng click nút "Hủy" trong `DeleteDocumentModal` để đưa độ bao phủ của container lên 100%.

→ **Kết luận**: Rủi ro **Thấp**.

---

### Câu Hỏi 2 — Đánh Giá Single Responsibility Hook (`use-candidate-drawer-state.ts`)

File: [`frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts`](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts) (250 dòng).

#### Thống kê định lượng:

- **`useState`**: **7** state:
  1. `drawerTab`: [dòng 42–44](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L42-L44) (`useState<"applications" | "documents">("applications")`)
  2. `drawerStageFilter`: [dòng 45](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L45) (`useState<string>("ALL")`)
  3. `drawerDocFilter`: [dòng 46](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L46) (`useState<string>("All")`)
  4. `drawerPreviewDoc`: [dòng 47–48](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L47-L48) (`useState<CandidateDocument | null>(null)`)
  5. `isUploadingDrawerDoc`: [dòng 49](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L49) (`useState(false)`)
  6. `drawerDocToDelete`: [dòng 50–51](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L50-L51) (`useState<CandidateDocument | null>(null)`)
  7. `isDeletingDoc`: [dòng 52](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L52) (`useState(false)`)

- **`useMutation`**: **4** mutation hooks (kèm 1 `useQuery` tại [dòng 39](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L39)):
  1. `uploadCandidateDocMutation`: [dòng 55](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L55)
  2. `deleteCandidateDocMutation`: [dòng 56](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L56)
  3. `deleteAppDocMutation`: [dòng 57](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L57)
  4. `deleteInterviewMutation`: [dòng 58](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L58)

- **`useMemo`**: **5** memoized selectors:
  1. `selectedCandidateDetails`: [dòng 60–88](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L60-L88)
  2. `selectedCandidateApps`: [dòng 90–95](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L90-L95)
  3. `filteredDrawerApps`: [dòng 97–102](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L97-L102)
  4. `drawerCandidateDocuments`: [dòng 104–125](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L104-L125)
  5. `filteredDrawerDocuments`: [dòng 127–133](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L127-L133)

- **`useCallback` / Action Handlers**:
  - `useCallback`: **0**
  - Action handlers: **4** handlers:
    1. `handleDownloadDoc`: [dòng 135–146](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L135-L146)
    2. `handleUploadDoc`: [dòng 148–163](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L148-L163)
    3. `handleConfirmDeleteDrawerDoc`: [dòng 165–195](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L165-L195)
    4. `handleCancelInterview`: [dòng 197–225](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L197-L225)

- **`useEffect`**: **0** (không có side effect ngầm).

#### Đánh giá SRP & Kiến trúc:

Hook đóng vai trò **State Coordinator** cho toàn bộ Drawer. Với 250 dòng, nó hoàn toàn tuân thủ giới hạn `<400 LOC` của dự án. Tuy nhiên, nó đang gộp 3 miền trách nhiệm:

1. Thông tin ứng viên & điều hướng tabs.
2. Vòng đời tài liệu (Upload, Download, Preview, Delete modal).
3. Ứng tuyển & Phỏng vấn (Filter stage, Cancel interview).

**Đề xuất tách**:

- `useCandidateDrawerDocuments`: phụ trách state tài liệu và 3 handlers liên quan.
- `useCandidateDrawerApplications`: phụ trách lọc stage và hủy lịch phỏng vấn.
- Hook chính chỉ giữ tab coordinator và candidate profile summary.

→ **Kết luận**: Rủi ro **Thấp**.

---

### Câu Hỏi 3 — Kiểm Tra Độ Bao Phủ Của Edge Case Tests

Đối chiếu file [`frontend/src/components/candidates/candidate-drawer.spec.tsx`](../../frontend/src/components/candidates/candidate-drawer.spec.tsx):

- **a) `candidateId` invalid / không tồn tại → 404 behavior**:  
  **[THIẾU TEST]**.  
  Hiện chỉ có test `candidate={null}` ([dòng 174–187](../../frontend/src/components/candidates/candidate-drawer.spec.tsx#L174-L187)). Nếu truyền object có ID nhưng query backend trả về 404, drawer fallback hiển thị thông tin tối thiểu từ prop thay vì sập, nhưng chưa có test case mô phỏng tình huống này.

- **b) Upload document fail (network error / 500) → rollback & toast**:  
  **[THIẾU TEST]**.  
  Code đã có khối `try/catch/finally` và `toast.error(getApiErrorMessage(err, t))` ([`use-candidate-drawer-state.ts:157–162`](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L157-L162)), nhưng trong test suite chỉ có test case upload thành công ([dòng 472–504](../../frontend/src/components/candidates/candidate-drawer.spec.tsx#L472-L504)).

- **c) Delete document khi đang ở preview mode → tự thoát preview**:  
  **[THIẾU TEST]**.  
  Code đã cài đặt logic tự động reset `drawerPreviewDoc` về `null` nếu trùng id hoặc url với file vừa xóa ([`use-candidate-drawer-state.ts:182–187`](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L182-L187)), nhưng spec test ([dòng 506–534](../../frontend/src/components/candidates/candidate-drawer.spec.tsx#L506-L534)) chỉ kiểm tra việc xóa từ danh sách, chưa kích hoạt preview trước khi bấm xóa.

- **d) Concurrent mutation (upload trong khi đang delete)**:  
  **[THIẾU TEST]**.  
  Nút upload bị disable khi `isUploadingDrawerDoc` ([`candidate-drawer-documents-tab.tsx:133`](../../frontend/src/components/candidates/drawer/candidate-drawer-documents-tab.tsx#L133)), và modal xóa có `isLoading={isDeletingDoc}`. Tuy nhiên nút xóa của từng card tài liệu không bị disable khi đang upload. Chưa có unit test cho luồng concurrent này.

- **e) Callback prop `onApplyToJob` hoặc `onScheduleInterview` throw error**:  
  **[THIẾU TEST]**.  
  Các callback prop được kích hoạt trực tiếp từ sự kiện click ([`candidate-drawer-applications-tab.tsx:67, 118`](../../frontend/src/components/candidates/drawer/candidate-drawer-applications-tab.tsx#L67)). `CandidateDrawer` không có local React Error Boundary riêng, nếu callback quăng synchronous error, lỗi sẽ nổi lên Error Boundary ở cấp page/layout. Chưa có test cho tình huống callback throw error.

→ **Kết luận**: Rủi ro **Trung bình**.

---

### Câu Hỏi 4 — Bảo Mật Xác Thực Tải Tài Liệu (Documents Tab Auth)

- **File định nghĩa**:  
  [`frontend/src/lib/api/client.ts:47–75`](../../frontend/src/lib/api/client.ts#L47-L75) (`downloadAuthenticatedFile`).
- **Cơ chế truyền Auth Token**:  
  Gọi qua `api.get(downloadPath, { responseType: "blob" })` ([dòng 53](../../frontend/src/lib/api/client.ts#L53)).  
  Token được đính kèm qua **2 cơ chế song song**:
  1. Header `Authorization: Bearer <token>` được gán tự động tại [`frontend/src/context/auth-context.tsx:113`](../../frontend/src/context/auth-context.tsx#L113).
  2. HttpOnly Cookie thông qua cấu hình `withCredentials: true` tại [`frontend/src/lib/api/client.ts:31`](../../frontend/src/lib/api/client.ts#L31).
- **Xử lý 401 & 403**:  
  **Chưa xử lý an toàn**. Khi API trả về 401 hoặc 403, khối `catch` ([dòng 63–74](../../frontend/src/lib/api/client.ts#L63-L74)) nuốt lỗi và tự động fallback sang tạo thẻ `<a download>` tải trực tiếp URL. Hậu quả là người dùng bị tải về một file giả lập chứa nội dung JSON báo lỗi (`{"statusCode":401,"message":"..."}`) thay vì được thông báo lỗi qua toast hoặc chuyển hướng login.
- **Thời hạn Presigned URL**:  
  Tại [`backend/src/minio/minio.service.ts:156–159`](../../backend/src/minio/minio.service.ts#L156-L159), tham số `expirySeconds` mặc định là **3,600 giây (1 giờ)**.
- **Tenant Isolation**:
  - **Với tài liệu theo Application (`appId` có giá trị)**:  
    Endpoint `/applications/:id/documents/download` ([`backend/src/applications/applications.controller.ts:137`](../../backend/src/applications/applications.controller.ts#L137)) gọi [`prepareDocumentDownload`](../../backend/src/applications/services/applications-documents.service.ts#L123-L167). Hàm này:
    - Kiểm tra nghiêm ngặt `tenantOrgId` qua `this.query.findOne(id, tenantOrgId)` ([dòng 130](../../backend/src/applications/services/applications-documents.service.ts#L130)).
    - Chống SSRF: kiểm tra URL tải về bắt buộc phải nằm trong tập `allowedUrls` của ứng viên/hồ sơ ([dòng 140–167](../../backend/src/applications/services/applications-documents.service.ts#L140-L167)).
    - Ghi nhận Audit Trail `PII_READ` ([dòng 182](../../backend/src/applications/services/applications-documents.service.ts#L182)).
  - **Với tài liệu gốc của Candidate (không có `appId`)**:  
    Tại [`use-candidate-drawer-state.ts:143`](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L143), code fallback gọi trực tiếp `getDocumentUrl(docUrl)`. Mặc dù backend đã có endpoint tenant-guarded `@Get(":id/documents/download")` tại [`backend/src/candidates/candidates.controller.ts:118`](../../backend/src/candidates/candidates.controller.ts#L118), nhưng client Drawer hiện tại chưa trỏ vào endpoint này khi thiếu `appId`.

→ **Kết luận**: Rủi ro **Cao**.

---

### Câu Hỏi 5 — An Toàn Trình Xem Trước Tài Liệu (Iframe Preview Security)

- **Nguồn URL của Iframe**:  
  Tại [`frontend/src/components/candidates/drawer/candidate-drawer-documents-tab.tsx:100`](../../frontend/src/components/candidates/drawer/candidate-drawer-documents-tab.tsx#L100):  
  `<iframe src={getDocumentUrl(previewDoc.url)} ... />`  
  Được build qua [`frontend/src/lib/api/client.ts:18–27`](../../frontend/src/lib/api/client.ts#L18-L27) và proxy sang MinIO qua cấu hình rewrite Next.js ([`frontend/next.config.ts:119–120`](../../frontend/next.config.ts#L119-L120)).
- **Thuộc tính bảo mật trên thẻ `<iframe>`**:
  - `sandbox`: **KHÔNG CÓ**.
  - `allow`: **KHÔNG CÓ**.
  - `referrerPolicy`: **KHÔNG CÓ**.
- **Header bảo mật phía Backend**:
  - Trong [`backend/src/main.ts:34–40`](../../backend/src/main.ts#L34-L40), NestJS cấu hình:  
    `X-Frame-Options: DENY` (dòng 35) và `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; ...` (dòng 39).  
    _(Lưu ý: Nếu nhúng API của NestJS vào iframe, trình duyệt sẽ chặn hiển thị. Hiện tại preview hoạt động vì proxy trực tiếp sang MinIO `/haihire-resumes/*`)_.
- **Xác thực MIME type khi tải file lên**:  
  **CÓ kiểm tra chặt chẽ 3 tầng tại Backend** ([`backend/src/common/upload-utils.ts`](../../backend/src/common/upload-utils.ts)):
  1. _Extension Whitelist_: `.pdf`, `.doc`, `.docx` ([dòng 13–17](../../backend/src/common/upload-utils.ts#L13-L17)).
  2. _MIME Type Whitelist_: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` ([dòng 6–11](../../backend/src/common/upload-utils.ts#L6-L11)).
  3. _Magic Bytes Buffer Verification_: [`dòng 40–99`](../../backend/src/common/upload-utils.ts#L40-L99) (`validateMagicBytes` kiểm tra byte signature thực tế: header `%PDF-` & trailer `%%EOF` với PDF, ZIP PK bytes với DOCX, OLE2 với DOC).

→ **Kết luận**: Rủi ro **Trung bình** (Backend đã chặn file độc qua magic bytes, nhưng iframe phía client cần bổ sung thuộc tính `sandbox` để đạt tiêu chuẩn phòng thủ theo chiều sâu).

---

### Câu Hỏi 6 — Điều Phối Phỏng Vấn & Cache Invalidation (Stale UI)

- **Vị trí `CandidateInterviewsList`**:  
  File [`frontend/src/components/interviews/candidate-interviews-list.tsx:40`](../../frontend/src/components/interviews/candidate-interviews-list.tsx#L40).
- **Mutation thực hiện hủy lịch phỏng vấn**:  
  Gọi mutation hook `useDeleteInterviewMutation()` ([`frontend/src/hooks/use-interview-queries.ts:107`](../../frontend/src/hooks/use-interview-queries.ts#L107)), được kích hoạt từ [`frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts:219`](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L219) (`await deleteInterviewMutation.mutateAsync(targetId)`).
- **Query keys được invalidate**:  
  File [`frontend/src/hooks/use-interview-queries.ts:112–119`](../../frontend/src/hooks/use-interview-queries.ts#L112-L119):
  ```ts
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["interviews"] });
    queryClient.invalidateQueries({ queryKey: ["applications"] });
  },
  onError: () => {
    queryClient.invalidateQueries({ queryKey: ["interviews"] });
    queryClient.invalidateQueries({ queryKey: ["applications"] });
  },
  ```
- **Nguy cơ Stale UI**:
  - Mutation **chỉ invalidate `["interviews"]` và `["applications"]`, HOÀN TOÀN KHÔNG invalidate `["candidates"]`** hay `queryKeys.candidate(id)`.
  - **Nguy cơ Stale UI là THẬT**:  
    Trong `use-candidate-drawer-state.ts` ([dòng 39, 90–95](../../frontend/src/components/candidates/drawer/use-candidate-drawer-state.ts#L39)), danh sách applications và phỏng vấn hiển thị trong Drawer được lấy từ query `useCandidate(id)`. Khi hủy phỏng vấn thành công, query `candidates` không được làm mới, dẫn đến việc Drawer **vẫn hiển thị lịch phỏng vấn vừa hủy** cho đến khi người dùng đóng mở lại Drawer hoặc hết hạn cache.
- **Cơ chế cập nhật UI**:  
  Hoàn toàn là **Refetch** (thông qua `invalidateQueries`), **KHÔNG có Optimistic update** (không cài đặt handler `onMutate` trong `useDeleteInterviewMutation`).

→ **Kết luận**: Rủi ro **Cao** (gây lỗi Stale UI trực tiếp trên giao diện Drawer).

---

## 2. Bảng Tổng Hợp Đánh Giá Rủi Ro

|  Câu  | Vấn đề / Khía cạnh                                                                          | Mức độ rủi ro  | Hành động khắc phục đề xuất                                                                                                                         | Ưu tiên |
| :---: | :------------------------------------------------------------------------------------------ | :------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------- | :-----: |
| **1** | Dòng 150–153 chưa cover nhánh đóng `DeleteDocumentModal` khi bấm "Hủy"                      |    **Thấp**    | Bổ sung 1 unit test kiểm tra luồng bấm "Hủy" đóng modal xóa tài liệu                                                                                | **P2**  |
| **2** | `useCandidateDrawerState` gộp 3 domain logic (7 state, 4 mutation)                          |    **Thấp**    | Tách thành 2 hook chuyên biệt: `useCandidateDrawerDocuments` và `useCandidateDrawerApplications`                                                    | **P2**  |
| **3** | Thiếu test cho 5 edge cases (lỗi mạng khi upload, rollback state, xóa trong preview)        | **Trung bình** | Bổ sung tests mô phỏng lỗi network upload và kiểm tra tự thoát preview khi xóa file                                                                 | **P1**  |
| **4** | `downloadAuthenticatedFile` nuốt lỗi 401/403; resume gốc candidate thiếu proxy tenant guard |    **Cao**     | Chuyển hướng tải candidate resume qua endpoint `/candidates/:id/documents/download`; hiển thị toast khi download thất bại thay vì tải file blob lỗi | **P0**  |
| **5** | Thẻ `iframe` preview tài liệu thiếu thuộc tính `sandbox` và `referrerPolicy`                | **Trung bình** | Bổ sung `sandbox="allow-scripts allow-same-origin"` và `referrerPolicy="no-referrer"` vào thẻ `<iframe>`                                            | **P1**  |
| **6** | `useDeleteInterviewMutation` thiếu invalidate `["candidates"]` gây Stale UI trong Drawer    |    **Cao**     | Bổ sung `queryClient.invalidateQueries({ queryKey: ["candidates"] })` vào `useDeleteInterviewMutation`                                              | **P0**  |

---

## 3. Lộ Trình Hành Động Khuyến Nghị

1. **Khắc phục ngay lập tức (P0)**:
   - Thêm `queryClient.invalidateQueries({ queryKey: ["candidates"] })` vào [`frontend/src/hooks/use-interview-queries.ts`](../../frontend/src/hooks/use-interview-queries.ts#L112) để loại bỏ hoàn toàn lỗi Stale UI khi hủy phỏng vấn.
   - Sửa `handleDownloadDoc` trong Drawer để khi không có `appId`, gọi endpoint bảo vệ `/candidates/${candidate.id}/documents/download` thay vì trỏ link MinIO trực tiếp.
2. **Củng cố bảo mật & chất lượng (P1 & P2)**:
   - Thêm `sandbox="allow-scripts allow-same-origin"` vào thẻ `<iframe>` preview.
   - Bổ sung 3 unit tests cho các edge cases (hủy đóng modal xóa, lỗi upload tài liệu, xóa khi đang preview).
   - Tách modular hóa hook `useCandidateDrawerState` khi tiến hành đợt dọn dẹp tiếp theo.
