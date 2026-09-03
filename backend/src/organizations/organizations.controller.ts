import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";
import { CreateOrgDto } from "./dto/create-org.dto";
import { JoinOrgDto } from "./dto/join-org.dto";
import { UpdateOrgDto } from "./dto/update-org.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("organizations")
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly orgsService: OrganizationsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateOrgDto,
  ) {
    return this.orgsService.create(req.user.id, dto);
  }

  @Post("join")
  @HttpCode(HttpStatus.OK)
  async join(
    @Request() req: { user: { id: string } },
    @Body() dto: JoinOrgDto,
  ) {
    return this.orgsService.join(req.user.id, dto);
  }

  @Get("search")
  async search(@Query("q") query: string) {
    return this.orgsService.search(query || "");
  }

  @Get("my")
  async getMyOrg(@Request() req: { user: { id: string } }) {
    return this.orgsService.getMyOrg(req.user.id);
  }

  @Patch("my")
  async updateMyOrg(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateOrgDto,
  ) {
    return this.orgsService.updateMyOrg(req.user.id, dto);
  }

  @Delete("my")
  async deleteMyOrg(@Request() req: { user: { id: string } }) {
    return this.orgsService.deleteMyOrg(req.user.id);
  }
}
