import { Inject, Injectable, Optional } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInterviewDto } from "./dto/create-interview.dto";
import { UpdateInterviewDto } from "./dto/update-interview.dto";
import { ActivitiesService } from "../activities/activities.service";
import { EmailService } from "../email/email.service";
import {
  InterviewsQueryService,
  InterviewsScheduleService,
  InterviewsScorecardService,
} from "./services";
import type {
  FindAllInterviewsOptions,
  InterviewType,
  InterviewFormat,
  InterviewUpdatePayload,
} from "./services";

export type {
  InterviewType,
  InterviewFormat,
  InterviewUpdatePayload,
  FindAllInterviewsOptions,
};

@Injectable()
export class InterviewsService {
  private readonly queryService: InterviewsQueryService;
  private readonly scheduleService: InterviewsScheduleService;
  private readonly scorecardService: InterviewsScorecardService;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ActivitiesService)
    private readonly activitiesService: ActivitiesService,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Optional()
    @Inject(InterviewsQueryService)
    queryService?: InterviewsQueryService,
    @Optional()
    @Inject(InterviewsScheduleService)
    scheduleService?: InterviewsScheduleService,
    @Optional()
    @Inject(InterviewsScorecardService)
    scorecardService?: InterviewsScorecardService,
  ) {
    this.queryService = queryService ?? new InterviewsQueryService(this.prisma);
    this.scorecardService =
      scorecardService ?? new InterviewsScorecardService();
    this.scheduleService =
      scheduleService ??
      new InterviewsScheduleService(
        this.prisma,
        this.activitiesService,
        this.emailService,
        this.queryService,
        this.scorecardService,
      );
  }

  async findAll(options?: FindAllInterviewsOptions) {
    return this.queryService.findAll(options);
  }

  async findOne(id: string, tenantOrgId?: string | null) {
    return this.queryService.findOne(id, tenantOrgId);
  }

  async create(dto: CreateInterviewDto, organizationId?: string | null) {
    return this.scheduleService.create(dto, organizationId);
  }

  async update(
    id: string,
    dto: UpdateInterviewDto,
    tenantOrgId?: string | null,
  ) {
    return this.scheduleService.update(id, dto, tenantOrgId);
  }

  async remove(id: string, tenantOrgId?: string | null) {
    return this.scheduleService.remove(id, tenantOrgId);
  }
}
