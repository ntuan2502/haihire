import { Logger } from "@nestjs/common";
import { EmailSendPayload, EmailSendResult, IEmailTransporter, TransporterConfig } from "./transporter.interface";

export class ResendTransporter implements IEmailTransporter {
  private readonly logger = new Logger(ResendTransporter.name);
  private readonly apiKey: string;

  constructor(config: TransporterConfig) {
    this.apiKey = config.resendApiKey || "";
  }

  async send(payload: EmailSendPayload): Promise<EmailSendResult> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: payload.from,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
        }),
      });

      const data = (await response.json()) as { id?: string; message?: string; name?: string };

      if (!response.ok) {
        const errorMsg = data.message || `Resend API returned status ${response.status}`;
        this.logger.error(`[RESEND EMAIL FAILED] ${errorMsg}`);
        return {
          success: false,
          status: "FAILED",
          error: errorMsg,
        };
      }

      this.logger.log(`[RESEND EMAIL SENT] ID: ${data.id} | To: ${payload.to}`);
      return {
        success: true,
        status: "SENT",
        messageId: data.id,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`[RESEND EMAIL FAILED] Network error: ${errorMessage}`);
      return {
        success: false,
        status: "FAILED",
        error: errorMessage,
      };
    }
  }
}
