export interface VariableDescriptor {
  key: string;
  label: string;
  category: "candidate" | "job" | "interview" | "organization" | "custom";
  exampleValue: string;
}

export const AVAILABLE_VARIABLES: VariableDescriptor[] = [
  // Candidate Variables
  { key: "candidate_name", label: "Họ và tên ứng viên", category: "candidate", exampleValue: "Nguyễn Văn An" },
  { key: "candidate_email", label: "Email ứng viên", category: "candidate", exampleValue: "an.nguyen@example.com" },
  { key: "candidate_phone", label: "Số điện thoại ứng viên", category: "candidate", exampleValue: "0912 345 678" },

  // Job Variables
  { key: "job_title", label: "Tên vị trí tuyển dụng", category: "job", exampleValue: "Senior Frontend Engineer" },
  { key: "job_department", label: "Phòng ban", category: "job", exampleValue: "Kỹ thuật (Engineering)" },
  { key: "job_location", label: "Địa điểm làm việc", category: "job", exampleValue: "Hà Nội / Remote" },
  { key: "job_salary", label: "Mức lương dự kiến", category: "job", exampleValue: "35,000,000 - 45,000,000 VND" },

  // Organization Variables
  { key: "company_name", label: "Tên công ty / tổ chức", category: "organization", exampleValue: "Nexus Corporation" },
  { key: "sender_name", label: "Tên người gửi / HR phụ trách", category: "organization", exampleValue: "Ban Tuyển dụng" },

  // Interview Variables
  { key: "interview_date", label: "Ngày phỏng vấn", category: "interview", exampleValue: "22/09/2026" },
  { key: "interview_time", label: "Giờ phỏng vấn", category: "interview", exampleValue: "14:30" },
  { key: "interview_format", label: "Hình thức (Meet/Zoom/Office)", category: "interview", exampleValue: "Google Meet" },
  { key: "interview_link", label: "Đường dẫn cuộc họp / Địa chỉ", category: "interview", exampleValue: "https://meet.google.com/xyz-abcd-efg" },
  { key: "interviewer_name", label: "Người phỏng vấn", category: "interview", exampleValue: "Trần Minh (Tech Lead)" },

  // Offer Variables
  { key: "start_date", label: "Ngày bắt đầu nhận việc", category: "custom", exampleValue: "01/10/2026" },
  { key: "salary", label: "Mức lương chính thức", category: "custom", exampleValue: "40,000,000 VND" },
];

export interface EmailContextSource {
  candidate?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  job?: {
    title?: string | null;
    department?: string | null;
    location?: string | null;
    salaryRange?: string | null;
  } | null;
  organization?: {
    name?: string | null;
  } | null;
  interview?: {
    date?: string | null;
    time?: string | null;
    format?: string | null;
    linkOrLocation?: string | null;
    interviewer?: string | null;
  } | null;
  sender?: {
    name?: string | null;
    email?: string | null;
  } | null;
  custom?: Record<string, string | number | undefined | null>;
}

export function buildDynamicEmailContext(source: EmailContextSource): Record<string, string> {
  const context: Record<string, string> = {};

  // Candidate
  if (source.candidate) {
    if (source.candidate.name) {
      context["candidate_name"] = source.candidate.name;
      context["candidate.name"] = source.candidate.name;
    }
    if (source.candidate.email) {
      context["candidate_email"] = source.candidate.email;
      context["candidate.email"] = source.candidate.email;
    }
    if (source.candidate.phone) {
      context["candidate_phone"] = source.candidate.phone;
      context["candidate.phone"] = source.candidate.phone;
    }
  }

  // Job
  if (source.job) {
    if (source.job.title) {
      context["job_title"] = source.job.title;
      context["job.title"] = source.job.title;
    }
    if (source.job.department) {
      context["job_department"] = source.job.department;
      context["job.department"] = source.job.department;
    }
    if (source.job.location) {
      context["job_location"] = source.job.location;
      context["job.location"] = source.job.location;
    }
    if (source.job.salaryRange) {
      context["job_salary"] = source.job.salaryRange;
      context["job.salary"] = source.job.salaryRange;
    }
  }

  // Organization
  if (source.organization?.name) {
    context["company_name"] = source.organization.name;
    context["organization.name"] = source.organization.name;
  }

  // Interview
  if (source.interview) {
    if (source.interview.date) context["interview_date"] = source.interview.date;
    if (source.interview.time) context["interview_time"] = source.interview.time;
    if (source.interview.format) context["interview_format"] = source.interview.format;
    if (source.interview.linkOrLocation) {
      context["interview_link"] = source.interview.linkOrLocation;
    }
    if (source.interview.interviewer) context["interviewer_name"] = source.interview.interviewer;
  }

  // Sender
  if (source.sender?.name) {
    context["sender_name"] = source.sender.name;
  }

  // Custom overrides
  if (source.custom) {
    for (const [key, val] of Object.entries(source.custom)) {
      if (val !== undefined && val !== null) {
        context[key] = String(val);
      }
    }
  }

  return context;
}
