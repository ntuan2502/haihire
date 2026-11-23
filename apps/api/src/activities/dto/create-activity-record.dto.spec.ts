import { describe, it, expect } from "vitest";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateActivityRecordDto } from "./create-activity-record.dto";
import { type ActivityType } from "../activities.service";

describe("CreateActivityRecordDto Specs", () => {
  it("should pass for complete valid activity record payload", async () => {
    const dto = plainToInstance(CreateActivityRecordDto, {
      candidateId: "cand-uuid-1",
      applicationId: "app-uuid-1",
      type: "STAGE_CHANGED",
      title: "Moved to Interview Stage",
      description: "Candidate successfully passed initial screening.",
      metadata: { previousStage: "SCREENING", newStage: "INTERVIEW" },
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("should pass with optional fields omitted", async () => {
    const dto = plainToInstance(CreateActivityRecordDto, {
      candidateId: "cand-uuid-1",
      type: "NOTE_ADDED",
      title: "Interviewer Note",
      description: "Strong background in distributed systems.",
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("should fail when candidateId is missing or empty", async () => {
    const dto = plainToInstance(CreateActivityRecordDto, {
      candidateId: "",
      type: "APPLIED",
      title: "Applied for Job",
      description: "Application submitted.",
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isNotEmpty).toBe("Candidate ID is required");
  });

  it("should fail when type is an invalid string enum", async () => {
    const dto = plainToInstance(CreateActivityRecordDto, {
      candidateId: "cand-1",
      type: "INVALID_EVENT_TYPE" as unknown as ActivityType,
      title: "Title",
      description: "Desc",
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isIn).toBe("Invalid activity type");
  });

  it("should fail when type contains script injection", async () => {
    const dto = plainToInstance(CreateActivityRecordDto, {
      candidateId: "cand-1",
      type: "<script>alert('xss')</script>" as unknown as ActivityType,
      title: "Title",
      description: "Desc",
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isIn).toBe("Invalid activity type");
  });

  it("should fail when title or description is missing", async () => {
    const dto = plainToInstance(CreateActivityRecordDto, {
      candidateId: "cand-1",
      type: "APPLIED",
      // missing title and description
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("should fail when candidateId is a number", async () => {
    const dto = plainToInstance(CreateActivityRecordDto, {
      candidateId: 12345,
      type: "EMAIL_SENT",
      title: "Email Sent",
      description: "Email confirmation dispatched.",
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isString).toBeDefined();
  });
});
