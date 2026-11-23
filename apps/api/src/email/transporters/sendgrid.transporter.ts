import { Logger } from "@nestjs/common";
import type {
  EmailSendPayload,
  EmailSendResult,
  IEmailTransporter,
  TransporterConfig,
} from "./transporter.interface";

function parseSendGridFrom(from: string): { email: string; name?: string } {
  const match = from.trim().match(/^(?:"?([^"]*?)"?\s*)?<([^>]+)>$/);
  if (match) {
    const name = match[1]?.trim();
    const email = match[2].trim();
    return name ? { email, name } : { email };
  }
  return { email: from.trim() };
}

export class SendGridTransporter implements IEmailTransporter {
  private readonly logger = new Logger(SendGridTransporter.name);
  private readonly apiKey: string;

  constructor(config: TransporterConfig) {
    this.apiKey = config.sendgridApiKey || "";
  }

  async send(payload: EmailSendPayload): Promise<EmailSendResult> {
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: payload.to }],
              subject: payload.subject,
            },
          ],
          from: parseSendGridFrom(payload.from),
          content: [
            {
              type: "text/html",
              value: payload.html,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `[SENDGRID EMAIL FAILED] Status: ${response.status} - ${errorText}`,
        );
        return {
          success: false,
          status: "FAILED",
          error: errorText,
        };
      }

      this.logger.log(
        `[SENDGRID EMAIL SENT] Status: 202 Accepted | To: ${payload.to}`,
      );
      return {
        success: true,
        status: "SENT",
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[SENDGRID EMAIL FAILED] Network error: ${errorMessage}`,
      );
      return {
        success: false,
        status: "FAILED",
        error: errorMessage,
      };
    }
  }
}
