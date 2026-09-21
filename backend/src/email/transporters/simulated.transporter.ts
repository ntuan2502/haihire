import { Logger } from "@nestjs/common";
import type { EmailSendPayload, EmailSendResult, IEmailTransporter } from "./transporter.interface";
import crypto from "node:crypto";

export class SimulatedTransporter implements IEmailTransporter {
  private readonly logger = new Logger(SimulatedTransporter.name);

  async send(payload: EmailSendPayload): Promise<EmailSendResult> {
    const id = `sim-${crypto.randomUUID().slice(0, 8)}`;
    this.logger.log(
      `[SIMULATED EMAIL] ID: ${id} | To: ${payload.to} | From: ${payload.from} | Subject: "${payload.subject}"`,
    );
    return {
      success: true,
      status: "SIMULATED",
      messageId: id,
    };
  }
}
