# BÁO CÁO XÁC MINH KỸ THUẬT #03: CONCURRENCY (LOST UPDATE) & ORPHAN CRON AUDIT
> **Tài liệu gửi DeepSeek & Chủ Dự Án (Single Source of Truth - Concurrency & Cron Reliability)**  
> **Dự án:** HaiHire Enterprise ATS Platform  
> **Người lập:** Antigravity (Senior Software Engineer / Lead Maintainer)  
> **Thời gian:** 2026-10-06  
> **Mã báo cáo:** `DOCS-REP-03`

---

## MỤC LỤC BÁO CÁO
1. [LOST UPDATE & CONCURRENCY] Cơ chế chống Lost Update khi cập nhật Stage trong `applications.service.ts`
2. [CONCURRENCY TEST] Kiểm thử Race Condition / 2 Users cập nhật đồng thời
3. [CRON SAFETY NET & OBSERVABILITY] Mức độ hiển thị (Visibility), Logging và Alerting của `scripts/cleanup-orphan-minio.ts`
4. [TỔNG KẾT RỦI RO & KHUYẾN NGHỊ KIẾN TRÚC] Action Items cho DeepSeek & Chủ Dự Án

---

## 1. [LOST UPDATE & CONCURRENCY] Cơ chế trong `applications.service.ts`

Khảo sát phương thức `updateStage(id, dto, tenantOrgId)` tại [`backend/src/applications/applications.service.ts:L786-816`](file:///c:/Workspaces/haihire/backend/src/applications/applications.service.ts#L786-L816):

### 1.1 Chi tiết câu hỏi khảo sát
- **Có cột version / optimistic locking (`WHERE version = X`) không?**
  - **Cột version:** **KHÔNG**. Bảng `Application` không có cột `version: Int`.
  - **Optimistic Locking:** **CÓ!** Hệ thống sử dụng chính giá trị trạng thái nghiệp vụ `stage` làm vị từ khóa lạc quan (**Optimistic Concurrency Predicate**): `WHERE id = :id AND stage = :oldStage`.
- **Có dùng `SELECT ... FOR UPDATE` (row-level lock) không?**
  - **KHÔNG.** Không sử dụng row-level lock hay pessimistic lock.
- **Có dùng transaction với isolation level cao hơn `READ COMMITTED` không?**
  - **KHÔNG.** Thao tác `updateStage` không mở transaction với isolation level `REPEATABLE READ` hay `SERIALIZABLE`. Nó thực thi trực tiếp câu lệnh `update` đơn lẻ thông qua connection mặc định (`READ COMMITTED`).

### 1.2 Dẫn chứng mã nguồn thực tế
Tại [`backend/src/applications/applications.service.ts:L787-816`](file:///c:/Workspaces/haihire/backend/src/applications/applications.service.ts#L787-L816):
```typescript
async updateStage(id: string, dto: UpdateStageDto, tenantOrgId?: string | null) {
  const existing = await this.findOne(id, tenantOrgId);
  const oldStage = existing.stage; // Đọc stage hiện tại (ví dụ: APPLIED)

  // 1. Kiểm tra tính hợp lệ của state machine
  if (dto.stage !== oldStage) {
    const allowedNextStages = (VALID_APPLICATION_STAGE_TRANSITIONS as Record<string, readonly string[]>)[oldStage] || [];
    if (!allowedNextStages.includes(dto.stage)) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.APPLICATION_INVALID_STAGE_TRANSITION,
        `Cannot transition application stage from '${oldStage}' to '${dto.stage}'...`,
        { currentStage: oldStage, targetStage: dto.stage },
      );
    }
  }

  // 2. OPTIMISTIC CONCURRENCY CONTROL: Cập nhật có điều kiện stage cũ
  const updatedRecord = await this.prisma.db.orm.public.Application
    .where((a) => a.id.eq(id))
    .where((a) => a.stage.eq(oldStage)) // <-- Chống Lost Update tại đây!
    .update({
      stage: dto.stage,
      ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
    });

  // 3. Xử lý xung đột khi có request khác ghi đè trước
  if (!updatedRecord) {
    throw new AppConflictException(
      APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT,
      `Application stage conflict: the application has been modified by another request. Current stage is no longer '${oldStage}'.`,
      { currentStage: oldStage, targetStage: dto.stage },
    );
  }
  // ...
}
```

### 1.3 Cơ chế phòng thủ:
Nếu User A và User B cùng mở ứng dụng khi hồ sơ ở `APPLIED`:
- User A gửi yêu cầu chuyển sang `SCREENING`.
- User B đồng thời gửi yêu cầu chuyển sang `REJECTED`.
- Request nào đến PostgreSQL trước sẽ cập nhật thành công (vì `stage = 'APPLIED'`).
- Request đến sau tìm kiếm `WHERE id = :id AND stage = 'APPLIED'` nhưng lúc này giá trị trong database đã bị đổi $\rightarrow$ câu lệnh update trả về `null` (không có bản ghi nào bị ảnh hưởng).
- Hệ thống phát hiện `!updatedRecord` và lập tức ném ra **`AppConflictException` (HTTP 409 Conflict)** với mã lỗi `APPLICATION_STAGE_CONFLICT`.
- **Kết luận:** **RỦI RO LOST UPDATE ĐÃ ĐƯỢC PHÒNG NGỪA (MITIGATED)** bằng cơ chế State-based Optimistic Locking.

---

## 2. [CONCURRENCY TEST] Kiểm thử Race Condition khi 2 Users cập nhật đồng thời

### 2.1 Kết quả khảo sát
- **Có test nào mô phỏng 2 users/requests cùng update 1 application không?** **CÓ.**
- **File test:** [`backend/src/applications/applications.service.spec.ts`](file:///c:/Workspaces/haihire/backend/src/applications/applications.service.spec.ts)
- **Tên test:** `should enforce optimistic locking during concurrent race updates: 1 succeeds, 1 receives 409 conflict`
- **Vị trí:** [Dòng 567 đến 582](file:///c:/Workspaces/haihire/backend/src/applications/applications.service.spec.ts#L567-L582)

### 2.2 Dẫn chứng mã nguồn test
```typescript
// backend/src/applications/applications.service.spec.ts:L567-582
it("should enforce optimistic locking during concurrent race updates: 1 succeeds, 1 receives 409 conflict", async () => {
  // app-1 starts at APPLIED. Both see APPLIED.
  const p1 = service.updateStage("app-1", { stage: ApplicationStage.SCREENING });
  const p2 = service.updateStage("app-1", { stage: ApplicationStage.REJECTED });

  // Mô phỏng 2 requests song song tranh chấp
  const results = await Promise.allSettled([p1, p2]);
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  // Đúng 1 request thành công và 1 request thất bại
  expect(fulfilled.length).toBe(1);
  expect(rejected.length).toBe(1);

  // Request thất bại nhận HTTP 409 Conflict với đúng mã lỗi
  const err = (rejected[0] as PromiseRejectedResult).reason;
  expect(err).toBeInstanceOf(AppConflictException);
  expect(err.code).toBe(APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT);
});
```

---

## 3. [CRON SAFETY NET & OBSERVABILITY] Cơ chế trong `scripts/cleanup-orphan-minio.ts`

Khảo sát [`scripts/cleanup-orphan-minio.ts`](file:///c:/Workspaces/haihire/scripts/cleanup-orphan-minio.ts) và core logic tại [`backend/src/common/orphan-cleanup.ts`](file:///c:/Workspaces/haihire/backend/src/common/orphan-cleanup.ts):

### 3.1 Có ghi log / metric nào để biết ĐÃ dọn bao nhiêu file không?
- **Về Log ra STDOUT:** **CÓ GHI LOG RÕ RÀNG.**  
  Sau khi hoàn tất, script in ra bản tóm tắt đầy đủ ra console (STDOUT) tại [`scripts/cleanup-orphan-minio.ts:L45-59`](file:///c:/Workspaces/haihire/scripts/cleanup-orphan-minio.ts#L45-L59):
  ```typescript
  console.log(`Total Objects Scanned:     ${report.scannedCount}`);
  console.log(`Active DB References:      ${report.dbRefCount}`);
  console.log(`Orphan Objects Found:      ${report.orphanCount}`);
  console.log(`  - Preserved (< ${thresholdDays}d):     ${report.preservedGraceCount}`);
  console.log(`  - ${isDryRun ? "Eligible for Deletion" : "Deleted"}:      ${report.deletedCount}`);
  console.log(`Storage Space Freed:       ${(report.bytesFreed / (1024 * 1024)).toFixed(2)} MB (${report.bytesFreed} bytes)`);

  if (report.deletedFiles.length > 0) {
    console.log(`\nFiles ${isDryRun ? "identified for deletion" : "deleted"}:`);
    report.deletedFiles.slice(0, 20).forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    // ...
  }
  ```
- **Về Metric:** **KHÔNG CÓ.**  
  Không có Prometheus Pushgateway, không có Counter/Gauge metric nào được cập nhật trong `MetricsService`.
- **Hạn chế về lưu trữ log:** Script chạy như một container cron độc lập (`orphan-cleanup` trong `docker-compose.prod.yml` chạy lúc `0 4 * * *`). Log chỉ tồn tại trong Docker logging daemon (`json-file`), nếu không cấu hình centralized log shipper (Vector, Promtail, FluentBit) thì SRE phải dùng lệnh `docker logs` để xem thủ công.

### 3.2 Có Alert nếu phát hiện > N file orphan trong một lần chạy không?
- **KHÔNG CÓ.**
- Code hoàn toàn không có logic ngưỡng:
  ```typescript
  // KHÔNG TỒN TẠI LOGIC NÀY:
  if (report.orphanCount > THRESHOLD_LIMIT) {
    sendAlertToSlackOrEmail(...);
  }
  ```
- Cho dù phát hiện 1 file hay 10,000 file mồ côi (dấu hiệu của một vụ rò rỉ hoặc lỗi bug hàng loạt ở luồng nộp hồ sơ), script vẫn chỉ âm thầm in ra STDOUT và thoát với exit code 0.

---

## 4. [TỔNG KẾT RỦI RO & KHUYẾN NGHỊ KIẾN TRÚC]

| Hạng mục | Đánh giá hiện trạng | Mức độ rủi ro | Khuyến nghị hành động (Action Items) |
| :--- | :--- | :---: | :--- |
| **Lost Update (Stage updates)** | Đã dùng State-based Optimistic Locking (`WHERE stage = :oldStage`) & có test race condition 409 Conflict. | **Thấp (Đã bảo vệ tốt)** | Không cần thêm cột `version`. Cơ chế hiện tại trực quan, nhẹ nhàng và an toàn với cơ sở dữ liệu. |
| **Orphan Cleanup Metrics** | In log chi tiết ra STDOUT nhưng **không có Prometheus metric**. | **Trung bình** | Bổ sung Pushgateway hoặc cập nhật metric `minio_orphan_files_cleaned_total` và `minio_orphan_bytes_freed_total` để Prometheus scrape. |
| **Orphan Spike Alerting** | **Không có ngưỡng cảnh báo** khi số lượng file mồ côi tăng đột biến (> N file). | **Cao** | **CẦN BỔ SUNG:** Đặt ngưỡng `ALERT_THRESHOLD = 50`. Nếu `orphanCount > ALERT_THRESHOLD`, gửi webhook khẩn cấp tới kênh Slack/Email của đội SRE để điều tra nguyên nhân rò rỉ trước khi file bị xóa tự động. |
