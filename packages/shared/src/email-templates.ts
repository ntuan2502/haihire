export type EmailTemplateType =
  | "APPLICATION_CONFIRMATION"
  | "INTERVIEW_INVITATION"
  | "REJECTION"
  | "OFFER"
  | "CUSTOM";

export type EmailDeliveryStatus = "SENT" | "SIMULATED" | "FAILED";

export type EmailProviderType = "SIMULATED" | "SMTP" | "RESEND" | "SENDGRID";

export interface TemplateDefinition {
  type: EmailTemplateType;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export interface EmailTemplate {
  id: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  variables: string[];
}

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateType, EmailTemplate> = {
  APPLICATION_CONFIRMATION: {
    id: "tpl-app-confirm",
    type: "APPLICATION_CONFIRMATION",
    name: "Xác nhận nộp hồ sơ thành công",
    subject: "[Xác nhận] Hồ sơ ứng tuyển vị trí {{job_title}} tại {{company_name}}",
    body: `<p>Kính gửi <strong>{{candidate_name}}</strong>,</p>
<p>Cảm ơn bạn đã quan tâm và ứng tuyển vào vị trí <strong>{{job_title}}</strong> tại <strong>{{company_name}}</strong>.</p>
<p>Chúng tôi đã tiếp nhận hồ sơ ứng tuyển của bạn. Đội ngũ tuyển dụng sẽ tiến hành đánh giá chi tiết kinh nghiệm và kỹ năng của bạn. Nếu hồ sơ của bạn phù hợp với tiêu chí tuyển dụng, chúng tôi sẽ liên hệ trong vòng 3 - 5 ngày làm việc để trao đổi về bước tiếp theo.</p>
<p>Chúc bạn một ngày làm việc hiệu quả và nhiều niềm vui!</p>
<p>Trân trọng,<br><strong>Đội ngũ Tuyển dụng {{company_name}}</strong></p>`,
    enabled: true,
    variables: ["candidate_name", "job_title", "company_name"],
  },
  INTERVIEW_INVITATION: {
    id: "tpl-interview-invite",
    type: "INTERVIEW_INVITATION",
    name: "Thư mời tham gia phỏng vấn",
    subject: "[Thư mời phỏng vấn] Vị trí {{job_title}} - {{company_name}}",
    body: `<p>Chào <strong>{{candidate_name}}</strong>,</p>
<p>Sau khi xem xét hồ sơ ứng tuyển của bạn cho vị trí <strong>{{job_title}}</strong>, <strong>{{company_name}}</strong> rất ấn tượng với những kinh nghiệm của bạn và trân trọng mời bạn tham gia buổi phỏng vấn tiếp theo.</p>
<p><strong>Thông tin chi tiết buổi phỏng vấn:</strong></p>
<ul>
  <li><strong>Thời gian:</strong> {{interview_time}}, Ngày {{interview_date}}</li>
  <li><strong>Hình thức:</strong> {{interview_format}}</li>
  <li><strong>Địa điểm / Link cuộc họp:</strong> <a href="{{interview_link}}">{{interview_link}}</a></li>
  <li><strong>Người phỏng vấn:</strong> {{interviewer_name}}</li>
</ul>
<p>Vui lòng phản hồi email này để xác nhận sự tham gia của bạn hoặc thông báo nếu bạn cần điều chỉnh lại lịch hẹn.</p>
<p>Trân trọng,<br><strong>{{sender_name}} - {{company_name}}</strong></p>`,
    enabled: true,
    variables: [
      "candidate_name",
      "job_title",
      "company_name",
      "interview_date",
      "interview_time",
      "interview_format",
      "interview_link",
      "interviewer_name",
      "sender_name",
    ],
  },
  REJECTION: {
    id: "tpl-rejection",
    type: "REJECTION",
    name: "Thư thông báo kết quả tuyển dụng",
    subject: "Thông báo kết quả ứng tuyển vị trí {{job_title}} - {{company_name}}",
    body: `<p>Kính gửi <strong>{{candidate_name}}</strong>,</p>
<p>Thay mặt <strong>{{company_name}}</strong>, chúng tôi chân thành cảm ơn bạn đã dành thời gian và sự quan tâm đến cơ hội nghề nghiệp tại công ty chúng tôi cho vị trí <strong>{{job_title}}</strong>.</p>
<p>Hội đồng tuyển dụng đã xem xét rất kỹ lưỡng hồ sơ của bạn. Mặc dù ấn tượng với những thành tích và năng lực của bạn, chúng tôi rất tiếc phải thông báo rằng ở thời điểm hiện tại, chúng tôi đã chọn một ứng viên khác có lộ trình kinh nghiệm phù hợp hơn với các yêu cầu đặc thù của dự án.</p>
<p>Chúng tôi sẽ lưu lại thông tin của bạn trong kho dữ liệu nhân tài (Talent Pool) và sẽ chủ động liên hệ lại khi có vị trí mới phù hợp với chuyên môn của bạn trong tương lai.</p>
<p>Chúc bạn luôn gặt hái được nhiều thành công trên con đường sự nghiệp!</p>
<p>Trân trọng,<br><strong>Đội ngũ Tuyển dụng {{company_name}}</strong></p>`,
    enabled: true,
    variables: ["candidate_name", "job_title", "company_name"],
  },
  OFFER: {
    id: "tpl-offer",
    type: "OFFER",
    name: "Thư mời nhận việc (Job Offer)",
    subject: "[Chúc mừng] Thư mời nhận việc vị trí {{job_title}} tại {{company_name}}",
    body: `<p>Thân gửi <strong>{{candidate_name}}</strong>,</p>
<p>Thay mặt <strong>{{company_name}}</strong>, chúng tôi rất vui mừng và vinh hạnh được gửi đến bạn Thư mời nhận việc cho vị trí <strong>{{job_title}}</strong>.</p>
<p>Qua các vòng trao đổi và phỏng vấn, ban lãnh đạo và đội ngũ chuyên môn đánh giá rất cao năng lực cũng như sự phù hợp văn hóa của bạn với định hướng phát triển của công ty.</p>
<p>Chi tiết về mức đãi ngộ, chế độ phúc lợi và ngày bắt đầu nhận việc đã được đính kèm trong tài liệu Offer chi tiết. Vui lòng xem xét và phản hồi xác nhận trước ngày được nêu trong văn bản.</p>
<p>Chào mừng bạn gia nhập đại gia đình <strong>{{company_name}}</strong>!</p>
<p>Trân trọng,<br><strong>{{sender_name}} - {{company_name}}</strong></p>`,
    enabled: true,
    variables: [
      "candidate_name",
      "job_title",
      "company_name",
      "sender_name",
    ],
  },
  CUSTOM: {
    id: "tpl-custom",
    type: "CUSTOM",
    name: "Email soạn thảo tùy chỉnh",
    subject: "Trao đổi về cơ hội nghề nghiệp tại {{company_name}}",
    body: `<p>Chào <strong>{{candidate_name}}</strong>,</p>
<p>Tôi là {{sender_name}} từ bộ phận tuyển dụng của <strong>{{company_name}}</strong>.</p>
<p>Tôi liên hệ với bạn liên quan đến hồ sơ ứng tuyển vị trí <strong>{{job_title}}</strong>...</p>
<p>Trân trọng,<br><strong>{{sender_name}} - {{company_name}}</strong></p>`,
    enabled: true,
    variables: [
      "candidate_name",
      "job_title",
      "company_name",
      "sender_name",
    ],
  },
};

export const DEFAULT_TEMPLATES: TemplateDefinition[] = (
  Object.keys(DEFAULT_EMAIL_TEMPLATES) as EmailTemplateType[]
).map((key) => {
  const tpl = DEFAULT_EMAIL_TEMPLATES[key];
  return {
    type: tpl.type,
    name: tpl.name,
    subject: tpl.subject,
    body: tpl.body,
    variables: tpl.variables,
  };
});

export function interpolateEmail(
  template: string,
  variables: Record<string, string | number | undefined | null>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    return variables[key] !== undefined && variables[key] !== null
      ? String(variables[key])
      : `{{${key}}}`;
  });
}
