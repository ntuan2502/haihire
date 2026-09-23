import {
  type EmailTemplateType,
  type EmailDeliveryStatus,
  type EmailProviderType,
  type EmailTemplate,
  DEFAULT_EMAIL_TEMPLATES,
  interpolateEmail,
} from "@haihire/shared";

export {
  type EmailTemplateType,
  type EmailDeliveryStatus,
  type EmailProviderType,
  type EmailTemplate,
  DEFAULT_EMAIL_TEMPLATES,
};

export interface EmailSettings {
  provider: EmailProviderType;
  fromName: string;
  fromEmail: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  resendApiKey?: string;
  sendgridApiKey?: string;
}

export interface EmailLog {
  id: string;
  organizationId?: string;
  candidateId?: string;
  candidateName?: string;
  candidateEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
  templateType: EmailTemplateType;
  subject: string;
  body: string;
  status: EmailDeliveryStatus;
  sentAt: string;
  senderName: string;
  senderEmail: string;
  errorMessage?: string;
}

export interface ActivityEvent {
  id: string;
  candidateId: string;
  applicationId?: string;
  type:
    | "APPLIED"
    | "STAGE_CHANGED"
    | "EMAIL_SENT"
    | "INTERVIEW_SCHEDULED"
    | "INTERVIEW_UPDATED"
    | "SCORECARD_SUBMITTED"
    | "NOTE_ADDED";
  title: string;
  description: string;
  actorName: string;
  actorRole?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface TemplateVariableItem {
  key: string;
  labelKey: string;
  label: string;
  example: string;
}

export const TEMPLATE_VARIABLES: readonly TemplateVariableItem[] = [
  { key: "{{candidate_name}}", labelKey: "email.varCandidateName", label: "Candidate Name", example: "Nguyễn Văn An" },
  { key: "{{candidate_email}}", labelKey: "email.varCandidateEmail", label: "Candidate Email", example: "an.nguyen@example.com" },
  { key: "{{job_title}}", labelKey: "email.varJobTitle", label: "Job Position", example: "Senior Frontend Engineer" },
  { key: "{{company_name}}", labelKey: "email.varCompanyName", label: "Company Name", example: "Nexus Corp" },
  { key: "{{interview_date}}", labelKey: "email.varInterviewDate", label: "Interview Date", example: "22/09/2026" },
  { key: "{{interview_time}}", labelKey: "email.varInterviewTime", label: "Interview Time", example: "14:30" },
  { key: "{{interview_format}}", labelKey: "email.varInterviewFormat", label: "Interview Format", example: "Google Meet" },
  { key: "{{interview_link}}", labelKey: "email.varInterviewLink", label: "Interview Link / Location", example: "https://meet.google.com/xyz-abcd-efg" },
  { key: "{{interviewer_name}}", labelKey: "email.varInterviewerName", label: "Interviewer Name", example: "Trần Minh Tech Lead" },
  { key: "{{sender_name}}", labelKey: "email.varSenderName", label: "Sender Name", example: "Recruiting Team" },
];

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  provider: "SIMULATED",
  fromName: "ATS Recruitment Team",
  fromEmail: "careers@workspace.com",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  resendApiKey: "",
  sendgridApiKey: "",
};

export function interpolateTemplate(
  text: string,
  variables: Record<string, string | undefined>,
): string {
  return interpolateEmail(text, variables);
}

export const MOCK_EMAIL_LOGS: EmailLog[] = [
  {
    id: "elog-1",
    candidateName: "Nguyễn Văn An",
    candidateEmail: "an.nguyen@example.com",
    templateType: "INTERVIEW_INVITATION",
    subject: "[Thư mời phỏng vấn] Vị trí Senior Frontend Engineer - Nexus Corp",
    body: `<p>Chào <strong>Nguyễn Văn An</strong>,</p><p>Nexus Corp trân trọng mời bạn tham gia buổi phỏng vấn Vòng Kỹ thuật vào lúc 14:30 ngày 22/09/2026 qua Google Meet...</p>`,
    status: "SENT",
    sentAt: "2026-09-17T14:30:00Z",
    senderName: "Sarah HR Lead",
    senderEmail: "sarah.hr@nexus.com",
  },
  {
    id: "elog-2",
    candidateName: "Trần Thị Mai",
    candidateEmail: "mai.tran@example.com",
    templateType: "APPLICATION_CONFIRMATION",
    subject: "[Xác nhận] Hồ sơ ứng tuyển vị trí Product Designer tại Nexus Corp",
    body: `<p>Kính gửi <strong>Trần Thị Mai</strong>,</p><p>Cảm ơn bạn đã nộp hồ sơ ứng tuyển vị trí Product Designer tại Nexus Corp. Chúng tôi đã nhận được hồ sơ của bạn...</p>`,
    status: "SIMULATED",
    sentAt: "2026-09-17T11:15:00Z",
    senderName: "Hệ thống ATS Tự động",
    senderEmail: "careers@nexus.com",
  },
  {
    id: "elog-3",
    candidateName: "Lê Hoàng Phúc",
    candidateEmail: "phuc.le@example.com",
    templateType: "REJECTION",
    subject: "Thông báo kết quả ứng tuyển vị trí Backend Engineer - Nexus Corp",
    body: `<p>Kính gửi <strong>Lê Hoàng Phúc</strong>,</p><p>Thay mặt Nexus Corp, chúng tôi chân thành cảm ơn bạn đã dành thời gian ứng tuyển...</p>`,
    status: "SENT",
    sentAt: "2026-09-16T16:45:00Z",
    senderName: "Alex Recruiter",
    senderEmail: "alex@nexus.com",
  },
  {
    id: "elog-4",
    candidateName: "Phạm Quốc Bảo",
    candidateEmail: "bao.pham@bad-domain.invalid",
    templateType: "APPLICATION_CONFIRMATION",
    subject: "[Xác nhận] Hồ sơ ứng tuyển vị trí DevOps Specialist tại Nexus Corp",
    body: `<p>Kính gửi <strong>Phạm Quốc Bảo</strong>,...</p>`,
    status: "FAILED",
    sentAt: "2026-09-16T09:20:00Z",
    senderName: "Hệ thống ATS Tự động",
    senderEmail: "careers@nexus.com",
    errorMessage: "SMTP 550: Recipient mailbox address does not exist or domain rejected.",
  },
];

export const MOCK_TIMELINE_EVENTS: ActivityEvent[] = [
  {
    id: "act-1",
    candidateId: "cand-1",
    type: "INTERVIEW_SCHEDULED",
    title: "Đã lên lịch phỏng vấn Vòng Kỹ thuật",
    description: "Lịch hẹn lúc 14:30 ngày 22/09/2026 qua Google Meet. Người phỏng vấn: Trần Minh Tech Lead.",
    actorName: "Sarah HR Lead",
    actorRole: "HR Manager",
    timestamp: "10 phút trước",
    metadata: {
      type: "TECHNICAL",
      format: "MEET",
      date: "2026-09-22",
      time: "14:30",
    },
  },
  {
    id: "act-2",
    candidateId: "cand-1",
    type: "EMAIL_SENT",
    title: "Đã gửi thư mời phỏng vấn",
    description: "Gửi tới email an.nguyen@example.com với tiêu đề: [Thư mời phỏng vấn] Vị trí Senior Frontend Engineer.",
    actorName: "Sarah HR Lead",
    actorRole: "HR Manager",
    timestamp: "10 phút trước",
    metadata: {
      templateType: "INTERVIEW_INVITATION",
      status: "SENT",
    },
  },
  {
    id: "act-3",
    candidateId: "cand-1",
    type: "STAGE_CHANGED",
    title: "Chuyển trạng thái sang Phỏng vấn (Interview)",
    description: "Ứng viên đã vượt qua vòng duyệt hồ sơ (Screening) và được đề xuất tham gia phỏng vấn kỹ thuật.",
    actorName: "Sarah HR Lead",
    actorRole: "HR Manager",
    timestamp: "2 giờ trước",
    metadata: {
      fromStage: "SCREENING",
      toStage: "INTERVIEW",
    },
  },
  {
    id: "act-4",
    candidateId: "cand-1",
    type: "NOTE_ADDED",
    title: "Đã thêm ghi chú đánh giá CV",
    description: "Ứng viên có hơn 4 năm kinh nghiệm React/Next.js, từng làm việc tại công ty Fintech, tiếng Anh lưu loát.",
    actorName: "Alex Recruiter",
    actorRole: "Recruiter",
    timestamp: "1 ngày trước",
  },
  {
    id: "act-5",
    candidateId: "cand-1",
    type: "EMAIL_SENT",
    title: "Đã gửi email xác nhận nộp hồ sơ",
    description: "Hệ thống tự động gửi email xác nhận đã nhận hồ sơ ứng tuyển cho ứng viên.",
    actorName: "Hệ thống ATS Tự động",
    timestamp: "2 ngày trước",
    metadata: {
      templateType: "APPLICATION_CONFIRMATION",
      status: "SENT",
    },
  },
  {
    id: "act-6",
    candidateId: "cand-1",
    type: "APPLIED",
    title: "Ứng viên nộp hồ sơ ứng tuyển",
    description: "Ứng viên nộp đơn qua Cổng thông tin nghề nghiệp công khai (Public Careers Portal) đính kèm CV Resume.pdf.",
    actorName: "Nguyễn Văn An",
    actorRole: "Ứng viên",
    timestamp: "2 ngày trước",
    metadata: {
      source: "Careers Portal",
      fileName: "Nguyen_Van_An_CV_2026.pdf",
    },
  },
];
