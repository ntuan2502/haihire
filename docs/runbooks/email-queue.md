# Runbook: Xử Lý Nghẽn Hàng Đợi Email (Email Queue Backlog)

**System:** HaiHire Enterprise ATS  
**Tài liệu liên quan:** [`monitoring/prometheus/alert-rules.yml`](file:///c:/Workspaces/haihire/monitoring/prometheus/alert-rules.yml)  
**Alert Rule:** `HaiHireEmailQueueBacklog` (Warning)  
**Phụ trách:** Đội ngũ SRE & Backend Engineering (team: sre)

---

## Khi nào alert này fire

- **`HaiHireEmailQueueBacklog` (Warning):**
  > Email queue `email-queue` có hơn 500 jobs ở trạng thái `waiting` trong hơn 10 phút.  
  > Tốc độ gửi thư của hệ thống (lời mời phỏng vấn, thư từ chối, thư xác thực) bị chậm trễ nghiêm trọng.

---

## Bước 1: Verify (Xác Minh Sự Cố)

Kiểm tra trực tiếp độ dài hàng đợi email trên Prometheus metrics:

```bash
# Production
curl -s http://localhost:3001/metrics | grep bullmq_queue_depth | grep email-queue

# Development
curl -s http://localhost:13001/metrics | grep bullmq_queue_depth | grep email-queue
```

Kiểm tra log của EmailProcessor:

```bash
docker compose -f docker-compose.prod.yml logs backend --tail=100 | grep -E "EmailProcessor|EmailService"
```

---

## Bước 2: Diagnose (Chẩn Đoán Nguyên Nhân)

1. **Kiểm tra trạng thái của bên cung cấp dịch vụ Email (Email Provider):**
   - **SMTP:** Kiểm tra kết nối tới máy chủ SMTP:
     ```bash
     nc -zv smtp.gmail.com 587
     ```
   - **Resend / SendGrid:** Kiểm tra trang trạng thái hệ thống:
     - Resend Status: https://status.resend.com
     - SendGrid Status: https://status.sendgrid.com
2. **Kiểm tra hạn mức (Rate Limits / Quota Exceeded):**
   - Tìm kiếm các lỗi HTTP `429 Too Many Requests` hoặc `Daily sending quota exceeded` trong log.
3. **Kiểm tra thông tin xác thực Email:**
   - Xác minh API key hoặc app password trong biến môi trường:
     `SYSTEM_EMAIL_PROVIDER`, `SYSTEM_EMAIL_SMTP_PASS`, `SYSTEM_EMAIL_RESEND_API_KEY`.

---

## Bước 3: Mitigate (Xử Lý Ngắn Hạn)

1. **Nếu Provider gặp sự cố diện rộng (Outage):**
   - Chuyển đổi tạm thời sang provider dự phòng (ví dụ chuyển từ SMTP sang Resend hoặc ngược lại) trong file `.env.production`:
     ```env
     SYSTEM_EMAIL_PROVIDER="RESEND"
     SYSTEM_EMAIL_RESEND_API_KEY="re_..."
     ```
   - Khởi động lại backend container để áp dụng:
     ```bash
     docker compose -f docker-compose.prod.yml restart backend
     ```
2. **Nếu hệ thống bị nghẽn do chiến dịch gửi thư hàng loạt:**
   - Tăng tạm thời worker concurrency trong cấu hình NestJS (nếu tài nguyên CPU/RAM cho phép).

---

## Bước 4: Resolve (Khắc Phục Dài Hạn)

1. Nâng cấp gói cước tài khoản nhà cung cấp Email nếu chạm trần dung lượng gửi thư hàng ngày.
2. Bổ sung cơ chế Rate Limiter và Exponential Backoff thích ứng cho từng tenant khi gửi email số lượng lớn.
3. Đảm bảo cấu hình SPF, DKIM, DMARC hợp lệ trên tên miền gửi thư để không bị mail server chặn kết nối.

---

## Bước 5: Post-Mortem (Kiểm Tra & Đóng Sự Cố)

- [ ] Metric `bullmq_queue_depth{queue="email-queue",state="waiting"}` giảm về `< 50`.
- [ ] Alert `HaiHireEmailQueueBacklog` đã chuyển trạng thái `RESOLVED`.
- [ ] Kiểm tra bảng `EmailLog` trong database để đếm số thư gửi thất bại:
  ```bash
  docker exec -it haihire-prod-postgres psql -U haihire_user -d haihire_db -c "SELECT status, COUNT(*) FROM \"EmailLog\" WHERE \"createdAt\" > NOW() - INTERVAL '2 hours' GROUP BY status;"
  ```
- [ ] Gửi thông báo tới các tổ chức bị trễ thư (nếu có yêu cầu).
