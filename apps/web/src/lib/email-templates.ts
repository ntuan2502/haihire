import {
  type EmailTemplateType,
  type EmailFlowKey,
  type EmailDeliveryStatus,
  type EmailProviderType,
  type EmailTemplate,
  type EmailFlowConfig,
  type EmailFlowDefinition,
  EMAIL_FLOW_KEYS,
  EMAIL_FLOW_DEFINITIONS,
  DEFAULT_EMAIL_TEMPLATES,
  interpolateEmail,
} from "@haihire/shared";

export {
  type EmailTemplateType,
  type EmailFlowKey,
  type EmailDeliveryStatus,
  type EmailProviderType,
  type EmailTemplate,
  type EmailFlowConfig,
  type EmailFlowDefinition,
  EMAIL_FLOW_KEYS,
  EMAIL_FLOW_DEFINITIONS,
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
  templateId?: string | null;
  templateName?: string | null;
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
  {
    key: "{{candidate_name}}",
    labelKey: "email.varCandidateName",
    label: "Candidate Name",
    example: "Nguyễn Văn An",
  },
  {
    key: "{{candidate_email}}",
    labelKey: "email.varCandidateEmail",
    label: "Candidate Email",
    example: "an.nguyen@example.com",
  },
  {
    key: "{{candidate_phone}}",
    labelKey: "",
    label: "Candidate Phone",
    example: "0912 345 678",
  },
  {
    key: "{{job_title}}",
    labelKey: "email.varJobTitle",
    label: "Job Position",
    example: "Senior Frontend Engineer",
  },
  {
    key: "{{job_department}}",
    labelKey: "",
    label: "Department",
    example: "Engineering",
  },
  {
    key: "{{job_location}}",
    labelKey: "",
    label: "Work Location",
    example: "Hà Nội / Remote",
  },
  {
    key: "{{job_salary}}",
    labelKey: "",
    label: "Salary Range",
    example: "35,000,000 - 45,000,000 VND",
  },
  {
    key: "{{company_name}}",
    labelKey: "email.varCompanyName",
    label: "Company Name",
    example: "Nexus Corp",
  },
  {
    key: "{{interview_date}}",
    labelKey: "email.varInterviewDate",
    label: "Interview Date",
    example: "22/09/2026",
  },
  {
    key: "{{interview_time}}",
    labelKey: "email.varInterviewTime",
    label: "Interview Time",
    example: "14:30",
  },
  {
    key: "{{interview_format}}",
    labelKey: "email.varInterviewFormat",
    label: "Interview Format",
    example: "Google Meet",
  },
  {
    key: "{{interview_link}}",
    labelKey: "email.varInterviewLink",
    label: "Interview Link / Location",
    example: "https://meet.google.com/xyz-abcd-efg",
  },
  {
    key: "{{interviewer_name}}",
    labelKey: "email.varInterviewerName",
    label: "Interviewer Name",
    example: "Trần Minh Tech Lead",
  },
  {
    key: "{{sender_name}}",
    labelKey: "email.varSenderName",
    label: "Sender Name",
    example: "Recruiting Team",
  },
  {
    key: "{{start_date}}",
    labelKey: "",
    label: "Start Date",
    example: "01/10/2026",
  },
  {
    key: "{{salary}}",
    labelKey: "",
    label: "Official Salary",
    example: "40,000,000 VND",
  },
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

const EMAIL_TEMPLATE_TYPE_LABEL_KEYS: Record<EmailTemplateType, string> = {
  APPLICATION_CONFIRMATION: "email.optApplicationConfirmation",
  INTERVIEW_INVITATION: "email.optInterviewInvitation",
  REJECTION: "email.optRejection",
  OFFER: "email.optOffer",
  CUSTOM: "email.optCustom",
};

const EMAIL_FLOW_META_KEYS: Record<
  EmailFlowKey,
  { titleKey: string; descKey: string }
> = {
  APPLICATION_RECEIVED: {
    titleKey: "email.flowApplicationReceivedTitle",
    descKey: "email.flowApplicationReceivedDesc",
  },
  INTERVIEW_SCHEDULED: {
    titleKey: "email.flowInterviewScheduledTitle",
    descKey: "email.flowInterviewScheduledDesc",
  },
  APPLICATION_REJECTED: {
    titleKey: "email.flowApplicationRejectedTitle",
    descKey: "email.flowApplicationRejectedDesc",
  },
  APPLICATION_OFFER: {
    titleKey: "email.flowApplicationOfferTitle",
    descKey: "email.flowApplicationOfferDesc",
  },
};

/**
 * Resolves a localized display label for an email template type enum value.
 */
export function getEmailTemplateTypeLabel(
  templateType: EmailTemplateType | string | null | undefined,
  t: (key: string) => string,
): string {
  if (!templateType) return "";
  const key = EMAIL_TEMPLATE_TYPE_LABEL_KEYS[templateType as EmailTemplateType];
  if (!key) return templateType;
  const translated = t(key);
  return translated && translated !== key ? translated : templateType;
}

/**
 * Builds localized select options for the 5 template categories.
 */
export function getEmailTemplateTypeOptions(t: (key: string) => string): Array<{
  value: EmailTemplateType;
  label: string;
}> {
  return (
    Object.keys(EMAIL_TEMPLATE_TYPE_LABEL_KEYS) as EmailTemplateType[]
  ).map((typeKey) => ({
    value: typeKey,
    label: getEmailTemplateTypeLabel(typeKey, t),
  }));
}

/**
 * Resolves localized title for one of the 4 standard email flow keys.
 */
export function getEmailFlowTitle(
  flowKey: EmailFlowKey,
  t: (key: string) => string,
): string {
  const meta = EMAIL_FLOW_META_KEYS[flowKey];
  if (!meta) return flowKey;
  const translated = t(meta.titleKey);
  return translated && translated !== meta.titleKey ? translated : flowKey;
}

/**
 * Resolves localized description for one of the 4 standard email flow keys.
 */
export function getEmailFlowDescription(
  flowKey: EmailFlowKey,
  t: (key: string) => string,
): string {
  const meta = EMAIL_FLOW_META_KEYS[flowKey];
  if (!meta) return "";
  const translated = t(meta.descKey);
  return translated && translated !== meta.descKey ? translated : "";
}

export function interpolateTemplate(
  text: string,
  variables: Record<string, string | undefined>,
): string {
  return interpolateEmail(text, variables);
}
