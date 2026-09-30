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
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.interviewsService.findAll({
      organizationId,
      jobId,
      applicationId,
      page: pageNum,
      limit: limitNum,
      search,
      tab,
      sortBy,
      tenantOrgId: req?.user?.organizationId,
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

