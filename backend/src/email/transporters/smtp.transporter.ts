import { Logger } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import type { EmailSendPayload, EmailSendResult, IEmailTransporter, TransporterConfig } from "./transporter.interface";

export class SmtpTransporter implements IEmailTransporter {
  private readonly logger = new Logger(SmtpTransporter.name);
  private transporter: Transporter;

  constructor(config: TransporterConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.smtpHost || "localhost",
      port: config.smtpPort || 587,
      secure: config.smtpSecure ?? false,
      auth: {
        user: config.smtpUser || "",
        pass: config.smtpPass || "",
      },
    });
  }

  async send(payload: EmailSendPayload): Promise<EmailSendResult> {
    try {
      const info = await this.transporter.sendMail({
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });
      this.logger.log(`[SMTP EMAIL SENT] Message ID: ${info.messageId} | To: ${payload.to}`);
      return {
        success: true,
        status: "SENT",
        messageId: info.messageId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`[SMTP EMAIL FAILED] Error: ${errorMessage}`);
      return {
        success: false,
        status: "FAILED",
        error: errorMessage,
      };
    }
  }
}
