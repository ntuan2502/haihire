# Runbook: Phục Hồi Bộ Nhớ Đệm & Hàng Đợi Valkey/Redis (Redis Recovery)

**System:** HaiHire Enterprise ATS  
**Tài liệu liên quan:** [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml)  
**Alert Rules:** `HaiHireRedisDown` (Critical), `HaiHireBullMqRedisDown` (Critical)  
**Phụ trách:** Đội ngũ SRE & Infra Engineering (team: sre)

---

## Khi nào alert này fire

- **`HaiHireBullMqRedisDown` (Critical):**
  > Metric `bullmq_queue_depth` trả về giá trị `-1` trong hơn 2 phút.  
  > `MetricsService` không thể kết nối hoặc truy vấn dữ liệu trạng thái từ Redis trong thời gian timeout 2.5s.  
  > Toàn bộ các async workers (Orphan Cleanup, Email Queue) bị tê liệt.
- **`HaiHireRedisDown` (Critical):**
  > Endpoint health check báo lỗi kết nối Redis ping timeout > 30s.

---

## Bước 1: Verify (Xác Minh Sự Cố)

1. **Kiểm tra trạng thái container Valkey/Redis:**
   ```bash
   # Production
   docker compose -f docker-compose.prod.yml ps redis

   # Development
   docker ps --filter "name=redis"
   ```

2. **Kiểm tra ping trực tiếp qua redis-cli:**
   ```bash
   # Development (port 16379)
   docker exec -it haihire-redis redis-cli ping

   # Production (trong mạng nội bộ)
   docker exec -it haihire-prod-redis redis-cli ping
   ```

3. **Kiểm tra metric Prometheus:**
   ```bash
   curl -s http://localhost:3001/metrics | grep bullmq_queue_depth | head -n 5
   # Nếu toàn bộ trả về -1 -> Redis connection blackout
   ```

---

## Bước 2: Diagnose (Chẩn Đoán Nguyên Nhân)

1. **Kiểm tra log của container Valkey/Redis:**
   ```bash
   docker compose -f docker-compose.prod.yml logs redis --tail=100
   ```
2. **Kiểm tra tài nguyên RAM và Swap của máy chủ:**
   ```bash
   free -m
   docker stats --no-stream haihire-prod-redis
   ```
   *Lưu ý:* Valkey/Redis thường bị crash do cơ chế OOMKiller của Linux khi dữ liệu vượt ngưỡng `deploy.resources.limits.memory` (mặc định 512MB).
3. **Kiểm tra dung lượng ổ đĩa AOF / RDB:**
   ```bash
   df -h /var/lib/docker/volumes/haihire_redis_data
   ```

---

## Bước 3: Mitigate (Xử Lý Ngắn Hạn)

1. **Nếu container đã dừng (Exited): Khởi động lại ngay lập tức:**
   ```bash
   docker compose -f docker-compose.prod.yml start redis
   # hoặc
   docker restart haihire-prod-redis
   ```
2. **Nếu container bị treo hoặc chiếm 100% CPU:**
   ```bash
   docker compose -f docker-compose.prod.yml restart redis
   ```
3. **Khởi động lại backend container nếu kết nối ioredis bị mất đồng bộ:**
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```

---

## Bước 4: Resolve (Khắc Phục Dài Hạn)

1. **Cấu hình `maxmemory` và chính sách Eviction thích hợp:**
   - Đảm bảo file cấu hình Redis bật chính sách loại bỏ khóa hết hạn:
     `maxmemory-policy volatile-lru` hoặc `allkeys-lru`.
2. **Tăng giới hạn tài nguyên trong `docker-compose.prod.yml`:**
   - Nâng `memory: 1024M` nếu tải dữ liệu hàng đợi và cache phiên làm việc tăng cao.
3. **Tách biệt kết nối Cache và Hàng đợi (Queue Separation):**
   - Xem xét phân tách instance Redis chuyên biệt cho BullMQ và instance cho ứng dụng cache khi lưu lượng vượt 10,000 requests/phút.

---

## Bước 5: Post-Mortem (Kiểm Tra & Đóng Sự Cố)

- [ ] Lệnh `redis-cli ping` trả về `PONG`.
- [ ] Metric `bullmq_queue_depth` trên `/metrics` khôi phục về các giá trị `0` hoặc số nguyên dương (không còn `-1`).
- [ ] Cả 2 alerts `HaiHireRedisDown` và `HaiHireBullMqRedisDown` đã chuyển sang `RESOLVED`.
- [ ] Kiểm tra xem có jobs nào bị kẹt hoặc mất mát trong quá trình Redis down bằng cách kiểm tra các hàng đợi BullMQ.
- [ ] Ghi chép báo cáo sự cố hạ tầng.
