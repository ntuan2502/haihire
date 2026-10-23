import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { TransferOwnershipDto } from "./transfer-ownership.dto";

describe("TransferOwnershipDto Specs", () => {
  it("should pass for a valid UUID newOwnerUserId", async () => {
    const dto = plainToInstance(TransferOwnershipDto, {
      newOwnerUserId: crypto.randomUUID(),
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("should pass for seeded demo account ID format (00000000-0000-0000-0000-000000000003)", async () => {
    const dto = plainToInstance(TransferOwnershipDto, {
      newOwnerUserId: "00000000-0000-0000-0000-000000000003",
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("should fail when newOwnerUserId is omitted", async () => {
    const dto = plainToInstance(TransferOwnershipDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isNotEmpty).toBeDefined();
  });

  it("should fail when newOwnerUserId is not a string", async () => {
    const dto = plainToInstance(TransferOwnershipDto, {
      newOwnerUserId: 12345,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isString).toBe(
      "newOwnerUserId must be a valid string",
    );
  });

  it("should fail when newOwnerUserId is empty string", async () => {
    const dto = plainToInstance(TransferOwnershipDto, {
      newOwnerUserId: "",
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
