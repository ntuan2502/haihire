import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EmailService } from "./email.service";
import type { SendEmailDto } from "./dto/send-email.dto";

export interface SendEmailJobData {
  dto: SendEmailDto;
  organizationId: string;
  senderUser?: { id?: string; name?: string };
}

@Processor("email-queue")
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(@Inject(EmailService) private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<SendEmailJobData>): Promise<unknown> {
    this.logger.log(`Processing email job ${job.id} for ${job.data?.dto?.to}`);
    try {
      return await this.emailService.executeSendEmail(
        job.data.dto,
        job.data.organizationId,
        job.data.senderUser,
      );
    } catch (err) {
      this.logger.error(`Failed to process email job ${job.id}:`, err);
      throw err;
    }
  }
}
