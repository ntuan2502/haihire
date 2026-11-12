import { describe, it, expect, vi } from "vitest";
import {
  BadRequestException,
  HttpStatus,
  type ArgumentsHost,
} from "@nestjs/common";
import { GlobalExceptionFilter } from "./http-exception.filter";

function createMockHost() {
  const jsonMock = vi.fn();
  const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status: statusMock }),
    }),
  } as unknown as ArgumentsHost;

  return { host, statusMock, jsonMock };
}

describe("GlobalExceptionFilter", () => {
  const filter = new GlobalExceptionFilter();

  it("injects VALIDATION_ERROR code on codeless array BadRequestException payloads", () => {
    const { host, statusMock, jsonMock } = createMockHost();
    const exception = new BadRequestException({
      statusCode: 400,
      error: "Bad Request",
      message: ["email must be an email"],
    });

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: 400,
      error: "Bad Request",
      message: ["email must be an email"],
      code: "VALIDATION_ERROR",
    });
  });

  it("injects VALIDATION_ERROR code on ParseUUIDPipe BadRequestException", () => {
    const { host, statusMock, jsonMock } = createMockHost();
    const exception = new BadRequestException(
      "Validation failed (uuid is expected)",
    );

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed (uuid is expected)",
      code: "VALIDATION_ERROR",
    });
  });

  it("preserves explicit error code when already present", () => {
    const { host, statusMock, jsonMock } = createMockHost();
    const exception = new BadRequestException({
      statusCode: 400,
      code: "ORG_NAME_REQUIRED",
      message: "Organization name is required",
    });

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: 400,
      code: "ORG_NAME_REQUIRED",
      message: "Organization name is required",
    });
  });
});
