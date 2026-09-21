import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EmailService } from "./email.service";
import type { SendEmailDto } from "./dto/send-email.dto";
import type { SendSystemEmailDto } from "./dto/send-system-email.dto";

export interface SendEmailJobData {
  dto: SendEmailDto;
  organizationId: string;
  senderUser?: { id?: string; name?: string };
}

export interface SendSystemEmailJobData {
  dto: SendSystemEmailDto;
}

@Processor("email-queue")
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(@Inject(EmailService) private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<SendEmailJobData | SendSystemEmailJobData>): Promise<unknown> {
    this.logger.log(`Processing email job '${job.name}' (ID: ${job.id})`);
    try {
      if (job.name === "send-system-email") {
        const data = job.data as SendSystemEmailJobData;
        return await this.emailService.executeSendSystemEmail(data.dto);
      }
      const data = job.data as SendEmailJobData;
      return await this.emailService.executeSendEmail(
        data.dto,
        data.organizationId,
        data.senderUser,
      );
    } catch (err) {
      this.logger.error(`Failed to process email job ${job.id}:`, err);
      throw err;
    }
  }
}
