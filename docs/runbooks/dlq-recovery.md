# Runbook: Phục Hồi Hàng Đợi Chết (BullMQ DLQ Recovery)

**System:** HaiHire Enterprise ATS  
**Tài liệu liên quan:** [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml), [`docs/runbooks/orphan-cleanup.md`](file:///c:/Workspaces/haihire/docs/runbooks/orphan-cleanup.md)  
**Alert Rules:** `HaiHireBullMqDlqGrowing` (Warning), `HaiHireBullMqDlqCritical` (Critical)  
**Phụ trách:** Đội ngũ SRE & Backend Engineering (team: sre)

---

## Khi nào alert này fire

- **`HaiHireBullMqDlqGrowing` (Warning):**
  > DLQ `orphan-cleanup-dlq` có hơn 10 jobs ở trạng thái `waiting` trong hơn 5 phút.  
  > Điều tra MinIO connectivity và DLQ worker.
- **`HaiHireBullMqDlqCritical` (Critical):**
  > DLQ `orphan-cleanup-dlq` có hơn 100 jobs ở trạng thái `waiting` trong hơn 2 phút.  
  > Nguy cơ rò rỉ dung lượng MinIO và nghẽn hàng đợi dọn dẹp file mồ côi. Cần escalate xử lý khẩn cấp.

---

## Bước 1: Verify (Xác Minh Sự Cố)

Kiểm tra số lượng jobs thực tế trong DLQ qua endpoint Prometheus Metrics:

```bash
# Kiểm tra số lượng job đang chờ trong DLQ (Production)
curl -s http://localhost:3001/metrics | grep bullmq_queue_depth | grep orphan-cleanup-dlq

# Kiểm tra trên môi trường Development
curl -s http://localhost:13001/metrics | grep bullmq_queue_depth | grep orphan-cleanup-dlq
```

Kiểm tra trực tiếp log của backend service để tìm dấu hiệu job thất bại:

```bash
# Xem log processor của orphan cleanup
docker compose -f docker-compose.prod.yml logs backend --tail=100 | grep -E "OrphanCleanup|DLQ"
```

---

## Bước 2: Diagnose (Chẩn Đoán Nguyên Nhân)

1. **Kiểm tra trạng thái MinIO Object Storage:**
   ```bash
   # Kiểm tra container MinIO còn sống không
   docker ps --filter "name=minio"

   # Kiểm tra healthcheck của MinIO
   curl -I http://localhost:9000/minio/health/live
   ```

2. **Kiểm tra kết nối và bucket MinIO:**
   ```bash
   # Kiểm tra thông số bucket haihire-resumes
   docker exec -it haihire-prod-backend node -e "
     const { Client } = require('minio');
     const client = new Client({
       endPoint: process.env.MINIO_ENDPOINT || 'minio',
       port: parseInt(process.env.MINIO_PORT || '9000'),
       useSSL: process.env.MINIO_USE_SSL === 'true',
       accessKey: process.env.MINIO_ACCESS_KEY,
       secretKey: process.env.MINIO_SECRET_KEY,
     });
     client.bucketExists(process.env.MINIO_BUCKET_NAME || 'haihire-resumes', (err, exists) => {
       if (err) console.error('Lỗi MinIO:', err.message);
       else console.log('Bucket tồn tại:', exists);
     });
   "
   ```

3. **Kiểm tra nguyên nhân thất bại của job trong DLQ:**
   - Các nguyên nhân thường gặp:
     - `S3 NoSuchKey` / `NoSuchBucket`: File đã bị xóa trước khi job xử lý hoặc bucket bị đổi tên.
     - `MinIO Connection Refused` / `Socket Timeout`: MinIO bị quá tải IOPS hoặc đầy ổ đĩa.
     - `Invalid Access Key / Secret Key`: Sai credentials MinIO sau khi cập nhật biến môi trường.

---

## Bước 3: Mitigate (Xử Lý Ngắn Hạn)

1. **Khởi động lại kết nối MinIO nếu bị treo:**
   ```bash
   docker compose -f docker-compose.prod.yml restart minio
   ```

2. **Khởi động lại backend container để tái kết nối Worker:**
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```

3. **Tạm thời giải phóng job tồn đọng hoặc chạy kịch bản quét bù:**
   ```bash
   # Chạy script cleanup orphan thủ công để giải phóng rác MinIO
   docker exec -it haihire-prod-backend node --import tsx scripts/cleanup-orphan-minio.ts
   ```

---

## Bước 4: Resolve (Khắc Phục Dài Hạn)

1. **Sửa lỗi cấu hình và thông tin xác thực:**
   - Đảm bảo `MINIO_ACCESS_KEY` và `MINIO_SECRET_KEY` trong `.env.production` khớp hoàn toàn với cấu hình máy chủ MinIO.
2. **Tăng kích thước volume MinIO nếu ổ đĩa đầy:**
   - Kiểm tra dung lượng volume: `df -h /var/lib/docker/volumes/haihire_minio_data`
   - Mở rộng ổ cứng nếu dung lượng > 90%.
3. **Điều chỉnh concurrency và retry backoff của BullMQ:**
   - Nếu worker bị quá tải bởi số lượng file upload lớn, tăng `concurrency` trong `OrphanCleanupProcessor`.

---

## Bước 5: Post-Mortem (Kiểm Tra & Đóng Sự Cố)

- [ ] Metric `bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"}` giảm về `0` hoặc `< 5`.
- [ ] Alert `HaiHireBullMqDlqGrowing` và `HaiHireBullMqDlqCritical` đã chuyển trạng thái thành `RESOLVED`.
- [ ] Chạy lệnh đếm file mồ côi: `node --import tsx scripts/cleanup-orphan-minio.ts --dry-run` để xác nhận không còn tồn đọng rác.
- [ ] Ghi chép root cause và hành động khắc phục vào kênh sự cố nội bộ.
