import { describe, it, expect } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { UpdateUserPreferencesDto } from "./update-user-preferences.dto";
import { DtoPipe } from "../../common/dto-validation.pipe";

describe("UpdateUserPreferencesDto", () => {
  it("passes with valid preferredLanguage and preferredTimezone", async () => {
    const dto = plainToInstance(UpdateUserPreferencesDto, {
      preferredLanguage: "en",
      preferredTimezone: "America/New_York",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("passes when null is explicitly sent to clear personal overrides", async () => {
    const dto = plainToInstance(UpdateUserPreferencesDto, {
      preferredLanguage: null,
      preferredTimezone: null,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.preferredLanguage).toBeNull();
    expect(dto.preferredTimezone).toBeNull();
  });

  it("rejects unsupported preferredLanguage", async () => {
    const dto = plainToInstance(UpdateUserPreferencesDto, {
      preferredLanguage: "jp",
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "preferredLanguage")).toBe(true);
  });

  it("rejects invalid IANA preferredTimezone", async () => {
    const dto = plainToInstance(UpdateUserPreferencesDto, {
      preferredTimezone: "Invalid/Zone_999",
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "preferredTimezone")).toBe(true);
  });

  it("preserves explicit null overrides when transformed through DtoPipe", async () => {
    const pipe = DtoPipe(UpdateUserPreferencesDto);
    const parsed = (await pipe.transform(
      { preferredLanguage: null, preferredTimezone: "Asia/Tokyo" },
      { type: "body" },
    )) as UpdateUserPreferencesDto;

    expect(parsed.preferredLanguage).toBeNull();
    expect(parsed.preferredTimezone).toBe("Asia/Tokyo");
  });

  it("rejects invalid preference payload through DtoPipe", async () => {
    const pipe = DtoPipe(UpdateUserPreferencesDto);
    await expect(
      pipe.transform({ preferredLanguage: "fr" }, { type: "body" }),
    ).rejects.toThrow(BadRequestException);
  });
});
