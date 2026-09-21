import { IEmailTransporter, TransporterConfig } from "./transporter.interface";
import { SimulatedTransporter } from "./simulated.transporter";
import { SmtpTransporter } from "./smtp.transporter";
import { ResendTransporter } from "./resend.transporter";
import { SendGridTransporter } from "./sendgrid.transporter";

export class EmailTransporterFactory {
  static create(config: TransporterConfig): IEmailTransporter {
    switch (config.provider) {
      case "SMTP":
        return new SmtpTransporter(config);
      case "RESEND":
        return new ResendTransporter(config);
      case "SENDGRID":
        return new SendGridTransporter(config);
      case "SIMULATED":
      default:
        return new SimulatedTransporter();
    }
  }
}
