import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApplicationsService } from "./applications.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { UpdateStageDto } from "./dto/update-stage.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";

@Controller("applications")
export class ApplicationsController {
  constructor(
    @Inject(ApplicationsService)
    private readonly applicationsService: ApplicationsService,
  ) {}

  @Get()
  findAll() {
    return this.applicationsService.findAll();
  }

  @Get("job/:jobId")
  findByJob(@Param("jobId", ParseIntPipe) jobId: number) {
    return this.applicationsService.findByJob(jobId);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.applicationsService.findOne(id);
  }

  @Post("apply")
  @UseInterceptors(
    FileInterceptor("resume", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  create(
    @Body() dto: CreateApplicationDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.applicationsService.create(dto, file);
  }

  @Patch(":id/stage")
  updateStage(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateStageDto,
  ) {
    return this.applicationsService.updateStage(id, dto);
  }

  @Patch(":id")
  updateCandidate(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCandidateDto,
  ) {
    return this.applicationsService.updateCandidate(id, dto);
  }

  @Post(":id/documents")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  uploadDocument(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.applicationsService.uploadDocument(id, file);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.applicationsService.remove(id);
  }
}
