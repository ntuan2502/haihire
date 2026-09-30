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
  findOne(
    @Param("id") id: string,
    @Request() req: { user?: { organizationId?: string | null } },
  ) {
    return this.interviewsService.findOne(id, req?.user?.organizationId);
  }

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  create(
    @Body() dto: CreateInterviewDto,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.interviewsService.create(dto, req?.user?.organizationId);
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateInterviewDto,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.interviewsService.update(id, dto, req?.user?.organizationId);
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  remove(
    @Param("id") id: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.interviewsService.remove(id, req?.user?.organizationId);
  }
}

