export interface EmailSendPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface EmailSendResult {
  success: boolean;
  status: "SENT" | "SIMULATED" | "FAILED";
  messageId?: string;
  error?: string;
}

export interface IEmailTransporter {
  send(payload: EmailSendPayload): Promise<EmailSendResult>;
}

export interface TransporterConfig {
  provider: "SIMULATED" | "SMTP" | "RESEND" | "SENDGRID" | string;
  fromName: string;
  fromEmail: string;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpSecure?: boolean;
  resendApiKey?: string | null;
  sendgridApiKey?: string | null;
}
