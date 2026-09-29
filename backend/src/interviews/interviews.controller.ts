import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { APP_ERROR_CODES } from "@haihire/shared";
import { AppForbiddenException } from "../common/app-exception";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { InterviewsService } from "./interviews.service";
import { CreateInterviewDto } from "./dto/create-interview.dto";
import { UpdateInterviewDto } from "./dto/update-interview.dto";

@Controller("interviews")
@UseGuards(AuthGuard("jwt"))
export class InterviewsController {
  constructor(
    @Inject(InterviewsService)
    private readonly interviewsService: InterviewsService,
  ) {}

  @Get()
  findAll(
    @Request() req: { user?: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
    @Query("jobId") jobId?: string,
    @Query("applicationId") applicationId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("tab") tab?: string,
    @Query("sortBy") sortBy?: string,
  ) {
    const userOrgId = req?.user?.organizationId || undefined;
    if (organizationId && userOrgId && organizationId !== userOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.INTERVIEW_INVALID_ORGANIZATION,
        "Access denied: cannot access interviews from another organization.",
        { organizationId },
      );
    }
    const orgId = userOrgId || organizationId || undefined;
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.interviewsService.findAll({
      organizationId: orgId,
      jobId,
      applicationId,
      page: pageNum,
      limit: limitNum,
      search,
      tab,
      sortBy,
    });
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @Request() req: { user?: { organizationId?: string | null } },
  ) {
    const interview = await this.interviewsService.findOne(id);
    const intvOrgId =
      (interview as unknown as { organizationId?: string })?.organizationId ||
      (interview as unknown as { application?: { job?: { organizationId?: string } } })?.application?.job?.organizationId;
    if (req?.user?.organizationId && intvOrgId && req.user.organizationId !== intvOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.INTERVIEW_INVALID_ORGANIZATION,
        "Access denied: interview belongs to another organization.",
        { id, organizationId: intvOrgId },
      );
    }
    return interview;
  }

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  create(
    @Body() dto: CreateInterviewDto,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.interviewsService.create(dto, req?.user?.organizationId || undefined);
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateInterviewDto,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    const interview = await this.interviewsService.findOne(id);
    const intvOrgId =
      (interview as unknown as { organizationId?: string })?.organizationId ||
      (interview as unknown as { application?: { job?: { organizationId?: string }; candidate?: { organizationId?: string } } })?.application?.job?.organizationId ||
      (interview as unknown as { application?: { candidate?: { organizationId?: string } } })?.application?.candidate?.organizationId;
    if (req?.user?.organizationId && intvOrgId && req.user.organizationId !== intvOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.INTERVIEW_INVALID_ORGANIZATION,
        "Access denied: interview belongs to another organization.",
        { id, organizationId: intvOrgId },
      );
    }
    return this.interviewsService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  async remove(
    @Param("id") id: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    const interview = await this.interviewsService.findOne(id);
    const intvOrgId =
      (interview as unknown as { organizationId?: string })?.organizationId ||
      (interview as unknown as { application?: { job?: { organizationId?: string }; candidate?: { organizationId?: string } } })?.application?.job?.organizationId ||
      (interview as unknown as { application?: { candidate?: { organizationId?: string } } })?.application?.candidate?.organizationId;
    if (req?.user?.organizationId && intvOrgId && req.user.organizationId !== intvOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.INTERVIEW_INVALID_ORGANIZATION,
        "Access denied: interview belongs to another organization.",
        { id, organizationId: intvOrgId },
      );
    }
    return this.interviewsService.remove(id);
  }
}

