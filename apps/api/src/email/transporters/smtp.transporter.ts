import { Logger } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { createConnection } from "node:net";
import {
  lookupPublicAddress,
  validatePublicHost,
} from "../../common/network.util";
import { env } from "../../config/env";
import type {
  EmailSendPayload,
  EmailSendResult,
  IEmailTransporter,
  TransporterConfig,
} from "./transporter.interface";

export class SmtpTransporter implements IEmailTransporter {
  private readonly logger = new Logger(SmtpTransporter.name);
  private transporter: Transporter;
  private readonly hostValidationError: string | null = null;

  constructor(config: TransporterConfig) {
    const rawHost = (config.smtpHost || "").trim();
    this.hostValidationError = validatePublicHost(rawHost);

    const port = config.smtpPort || 587;

    // Port 465 → implicit SSL/TLS (secure: true)
    // Port 587/25 → STARTTLS (secure: false + requireTLS: true)
    // User can override via smtpSecure, but we auto-derive if undefined
    const isImplicitSsl = port === 465;
    const secure =
      config.smtpSecure !== undefined
        ? config.smtpSecure && isImplicitSsl
        : isImplicitSsl;
    const requireTLS = !secure && port === 587;

    const isProduction = env.NODE_ENV === "production";

    this.transporter = nodemailer.createTransport({
      host: rawHost,
      port,
      secure,
      requireTLS,
      auth: {
        user: config.smtpUser || "",
        pass: config.smtpPass || "",
      },
      getSocket: (_options, callback) => {
        const socket = createConnection({
          host: rawHost,
          port,
          lookup: lookupPublicAddress,
        });
        const onError = (error: Error) => {
          socket.destroy();
          callback(error, undefined);
        };
        socket.setTimeout(5000, () =>
          socket.destroy(new Error("SMTP connection timed out")),
        );
        socket.once("error", onError);
        socket.once("connect", () => {
          socket.setTimeout(0);
          socket.removeListener("error", onError);
          // Nodemailer upgrades this raw socket for implicit TLS or STARTTLS,
          // retaining rawHost for SNI and certificate hostname verification.
          callback(null, { connection: socket });
        });
      },
      tls: {
        // Enforce valid TLS certificate in production, allow self-signed in dev/test
        rejectUnauthorized: isProduction,
        minVersion: "TLSv1.2",
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    } satisfies SMTPTransport.Options);
  }

  async send(payload: EmailSendPayload): Promise<EmailSendResult> {
    if (this.hostValidationError) {
      const errorMessage = `SMTP destination rejected: ${this.hostValidationError}`;
      this.logger.error(`[SMTP EMAIL FAILED] Error: ${errorMessage}`);
      return {
        success: false,
        status: "FAILED",
        error: errorMessage,
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });
      this.logger.log(
        `[SMTP EMAIL SENT] Message ID: ${info.messageId} | To: ${payload.to}`,
      );
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
