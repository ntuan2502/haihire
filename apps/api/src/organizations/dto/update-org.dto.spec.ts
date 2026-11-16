import { describe, it, expect } from "vitest";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { UpdateOrgDto } from "./update-org.dto";

describe("UpdateOrgDto", () => {
  it("passes with valid partial localization fields", async () => {
    const dto = plainToInstance(UpdateOrgDto, {
      defaultLanguage: "en",
      timezone: "America/New_York",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12H",
      nameDisplayOrder: "LAST_FIRST",
      defaultCurrency: "USD",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("passes when only name or empty payload is sent", async () => {
    const dto = plainToInstance(UpdateOrgDto, { name: "Acme Corp" });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects invalid defaultLanguage", async () => {
    const dto = plainToInstance(UpdateOrgDto, { defaultLanguage: "fr" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "defaultLanguage")).toBe(true);
  });

  it("rejects invalid IANA timezone", async () => {
    const dto = plainToInstance(UpdateOrgDto, { timezone: "Mars/Olympus" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "timezone")).toBe(true);
  });

  it("rejects invalid dateFormat, timeFormat, nameDisplayOrder, or defaultCurrency", async () => {
    const dto = plainToInstance(UpdateOrgDto, {
      dateFormat: "YYYY/MM/DD",
      timeFormat: "MILITARY",
      nameDisplayOrder: "MIDDLE_FIRST",
      defaultCurrency: "BTC",
    });

    const errors = await validate(dto);
    const props = errors.map((e) => e.property);
    expect(props).toContain("dateFormat");
    expect(props).toContain("timeFormat");
    expect(props).toContain("nameDisplayOrder");
    expect(props).toContain("defaultCurrency");
  });
});
