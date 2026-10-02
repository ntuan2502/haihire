# RUNBOOK: MinIO Orphan File Cleanup Operation
**Hệ thống:** HaiHire Enterprise ATS  
**Tần suất tự động:** Hàng ngày vào lúc 04:00 AM (`0 4 * * *`)  
**Mục tiêu:** Quét và loại bỏ các file CV/hồ sơ tồn đọng trên MinIO bucket (`haihire-resumes`) không còn liên kết với bất kỳ bản ghi cơ sở dữ liệu nào (`CandidateDocument`, `Application`, `Candidate`), giải phóng dung lượng lưu trữ an toàn.

---

## 1. NGUYÊN TẮC HOẠT ĐỘNG & NGƯỠNG AN TOÀN (GRACE PERIOD)

1. **Grace Period (30 ngày):**  
   - Bất kỳ file nào được tạo trong vòng 30 ngày qua (`age < 30 days`) kể cả khi chưa có reference trong DB sẽ **KHÔNG BAO GIỜ BỊ XÓA**.
   - Điều này đảm bảo an toàn tuyệt đối cho các tác vụ nộp hồ sơ đang xử lý (in-flight uploads), các ứng viên đang điền form, hoặc các transaction đang chờ xử lý.
2. **Tiêu chí xóa:**
   - File nằm trong bucket `haihire-resumes/tenants/*/resumes/*`.
   - Hoàn toàn KHÔNG tồn tại tham chiếu trong DB (`CandidateDocument.url`, `Application.resumeUrl`, `Candidate.resumeUrl`).
   - Thời gian sửa đổi cuối cùng (`lastModified`) $\ge$ 30 ngày.

---

## 2. HƯỚNG DẪN THỰC THI THỦ CÔNG (MANUAL EXECUTION)

### Bước 1: Chạy mô phỏng an toàn (Dry-Run Mode)
Trước khi xóa thực tế trên production, **luôn luôn** chạy ở chế độ dry-run để xem báo cáo thống kê và danh sách file dự kiến xóa mà không làm mất dữ liệu:

```bash
# Trên máy trạm hoặc trong container backend
pnpm --filter backend exec tsx scripts/cleanup-orphan-minio.ts --dry-run

# Hoặc tùy chỉnh ngưỡng ngày (ví dụ kiểm tra các file cũ hơn 60 ngày)
pnpm --filter backend exec tsx scripts/cleanup-orphan-minio.ts --dry-run --threshold-days=60
```

**Kỳ vọng kết quả đầu ra:**
```text
==================================================================
       HAIHIRE ENTERPRISE ATS: MINIO ORPHAN CLEANUP CRON          
==================================================================
Execution Mode:       DRY-RUN (Safe Simulation - No Deletions)
Age Threshold:        30 days
Target Bucket:        haihire-resumes
------------------------------------------------------------------
Total Objects Scanned:     142
Active DB References:      135
Orphan Objects Found:      7
  - Preserved (< 30d):     5
  - Eligible for Deletion: 2
Storage Space Freed:       4.12 MB (4320140 bytes)
==================================================================
```

### Bước 2: Thực thi xóa thực tế (Live Execution)
Sau khi xác nhận danh sách file cần dọn dẹp trong báo cáo Dry-Run:

```bash
pnpm --filter backend exec tsx scripts/cleanup-orphan-minio.ts --threshold-days=30
```

---

## 3. CẤU HÌNH CRONJOB TỰ ĐỘNG TRÊN PRODUCTION

Hệ thống đã được đóng gói sẵn cron container `orphan-cleanup` trong [docker-compose.prod.yml](file:///c:/Workspaces/haihire/docker-compose.prod.yml):
- **Lịch chạy:** `0 4 * * *` (04:00 sáng mỗi ngày theo giờ hệ thống).
- **Log file:** `/var/log/orphan-cleanup.log`
- **Kiểm tra logs cron:**
  ```bash
  docker compose -f docker-compose.prod.yml logs orphan-cleanup --tail=100
  ```

---

## 4. QUY TRÌNH ROLLBACK / KHÔI PHỤC KHI XÓA NHẦM

Trong trường hợp hãn hữu phát hiện file quan trọng bị xóa ngoài ý muốn:

1. **Ngừng ngay cron job:**
   ```bash
   docker compose -f docker-compose.prod.yml stop orphan-cleanup
   ```
2. **Khôi phục từ bản sao lưu MinIO gần nhất:**
   Hệ thống HaiHire thực hiện sao lưu MinIO định kỳ qua script [scripts/backup-production.ts](file:///c:/Workspaces/haihire/scripts/backup-production.ts).
   Bản snapshot lưu trữ tại thư mục `backups/minio-backup-YYYY-MM-DD.tar.gz`.
3. **Giải nén và đồng bộ lại tệp cần phục hồi:**
   ```bash
   # Giải nén bản backup
   tar -xzf backups/minio-backup-YYYY-MM-DD.tar.gz -C /tmp/restore-minio/

   # Copy lại file bị thiếu vào MinIO bucket qua mc (MinIO Client)
   mc cp /tmp/restore-minio/tenants/<orgId>/resumes/<filename>.pdf local-minio/haihire-resumes/tenants/<orgId>/resumes/
   ```
4. **Kiểm tra tính toàn vẹn (Verification):**
   - Đăng nhập vào giao diện tuyển dụng.
   - Truy cập trang chi tiết ứng viên có hồ sơ vừa khôi phục.
   - Nhấp vào "Tải CV" và xác nhận file PDF tải về nguyên vẹn.

---
**Bộ phận phụ trách:** Senior Backend Engineer + SRE Infrastructure Team
