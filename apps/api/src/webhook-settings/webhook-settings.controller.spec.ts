import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebhookSettingsController } from "./webhook-settings.controller";
import { WebhookSettingsService } from "./webhook-settings.service";
import { RolesGuard } from "../auth/roles.guard";
import { Reflector } from "@nestjs/core";
import { AppForbiddenException } from "../common/app-exception";
import { DtoPipe } from "../common/dto-validation.pipe";
import { CreateWebhookSettingDto } from "./dto/create-webhook-setting.dto";
import type { ExecutionContext } from "@nestjs/common";

describe("WebhookSettingsController", () => {
  let controller: WebhookSettingsController;
  let service: WebhookSettingsService;

  const mockService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    testConnection: vi.fn(),
  };

  const adminReq = {
    user: {
      id: "admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      organizationId: "org-1",
    },
  };

  const memberReq = {
    user: {
      id: "member-1",
      email: "member@test.com",
      role: "MEMBER",
      organizationId: "org-1",
    },
  };

  const missingOrgReq = {
    user: {
      id: "user-no-org",
      email: "user@test.com",
      role: "ADMIN",
      organizationId: undefined,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService as unknown as WebhookSettingsService;
    controller = new WebhookSettingsController(service);
  });

  type ReqParam = Parameters<WebhookSettingsController["findAll"]>[0];

  it("Case 1: findAll delegates to service with user's organizationId", async () => {
    mockService.findAll.mockResolvedValue([
      {
        id: "setting-1",
        organizationId: "org-1",
        eventType: "DLQ_ALERT",
        provider: "TELEGRAM",
        webhookUrl: "https://api.telegram.org/bot***/sendMessage",
      },
    ]);

    const result = await controller.findAll(adminReq as unknown as ReqParam);
    expect(mockService.findAll).toHaveBeenCalledWith("org-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("setting-1");
  });

  it("Case 2: findOne delegates to service with id and user's organizationId", async () => {
    mockService.findOne.mockResolvedValue({
      id: "setting-1",
      organizationId: "org-1",
      eventType: "DLQ_ALERT",
      provider: "TELEGRAM",
      webhookUrl: "https://api.telegram.org/bot***/sendMessage",
    });

    const result = await controller.findOne(
      "setting-1",
      adminReq as unknown as ReqParam,
    );
    expect(mockService.findOne).toHaveBeenCalledWith("setting-1", "org-1");
    expect(result.id).toBe("setting-1");
  });

  it("Case 3: create delegates to service with orgId, userId, and DTO", async () => {
    const dto = {
      eventType: "DLQ_ALERT" as const,
      provider: "TELEGRAM" as const,
      webhookUrl: "https://api.telegram.org/bot123/sendMessage",
      chatId: "-1001",
      isEnabled: true,
    };
    mockService.create.mockResolvedValue({
      id: "new-setting",
      ...dto,
      webhookUrl: "https://api.telegram.org/bot***/sendMessage",
    });

    const result = await controller.create(
      adminReq as unknown as ReqParam,
      dto,
    );
    expect(mockService.create).toHaveBeenCalledWith("org-1", "admin-1", dto);
    expect(result.id).toBe("new-setting");
  });

  it("Case 4: update delegates to service with id, orgId, userId, and update DTO", async () => {
    const updateDto = { isEnabled: false };
    mockService.update.mockResolvedValue({
      id: "setting-1",
      isEnabled: false,
    });

    const result = await controller.update(
      "setting-1",
      adminReq as unknown as ReqParam,
      updateDto,
    );
    expect(mockService.update).toHaveBeenCalledWith(
      "setting-1",
      "org-1",
      "admin-1",
      updateDto,
    );
    expect(result.isEnabled).toBe(false);
  });

  it("Case 5: delete delegates to service with id and orgId", async () => {
    mockService.delete.mockResolvedValue({ success: true });

    const result = await controller.delete(
      "setting-1",
      adminReq as unknown as ReqParam,
    );
    expect(mockService.delete).toHaveBeenCalledWith("setting-1", "org-1");
    expect(result).toEqual({ success: true });
  });

  it("Case 6: testConnection delegates to service with orgId and test DTO", async () => {
    const testDto = {
      provider: "DISCORD" as const,
      webhookUrl: "https://discord.com/api/webhooks/123/xyz",
    };
    mockService.testConnection.mockResolvedValue({
      success: true,
      message: "Webhook test sent successfully",
    });

    const result = await controller.testConnection(
      adminReq as unknown as ReqParam,
      testDto,
    );
    expect(mockService.testConnection).toHaveBeenCalledWith("org-1", testDto);
    expect(result.success).toBe(true);
  });

  it("Case 7: throws AppForbiddenException if organizationId context is missing", async () => {
    await expect(
      controller.findAll(missingOrgReq as unknown as ReqParam),
    ).rejects.toThrow(AppForbiddenException);
  });

  it("Case 8: RolesGuard blocks MEMBER when role is not ADMIN", () => {
    const reflector = new Reflector();
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(["ADMIN"]);
    const guard = new RolesGuard(reflector);

    const mockContext = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => memberReq,
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(AppForbiddenException);
  });

  it("Case 9: DtoPipe validates invalid CreateWebhookSettingDto input and rejects", async () => {
    const pipe = DtoPipe(CreateWebhookSettingDto);
    const invalidBody = {
      eventType: "INVALID_EVENT",
      provider: "TELEGRAM",
      webhookUrl: "not-a-telegram-url",
    };

    await expect(
      pipe.transform(invalidBody, {
        type: "body",
        metatype: CreateWebhookSettingDto,
      }),
    ).rejects.toThrow();
  });

  it("Case 10: methods require settings:manage_integrations permission, rejecting MEMBER", () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);

    const mockContext = {
      getHandler: () => controller.findAll,
      getClass: () => WebhookSettingsController,
      switchToHttp: () => ({
        getRequest: () => memberReq,
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(AppForbiddenException);
  });

  it("Case 11: methods allow ADMIN with settings:manage_integrations permission", () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);

    const mockContext = {
      getHandler: () => controller.findAll,
      getClass: () => WebhookSettingsController,
      switchToHttp: () => ({
        getRequest: () => adminReq,
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
