import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { isEmail } from "class-validator";
import { APP_ERROR_CODES } from "@haihire/shared";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/encryption.service";
import { UpdateEmailSettingDto } from "../dto/update-setting.dto";
import { toInstant } from "../../common/date.util";
import { env } from "../../config/env";

@Injectable()
export class EmailSettingsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EncryptionService)
    private readonly encryptionService: EncryptionService,
  ) {}

  resolveOrgId(
    userOrgId?: string | null,
    requestedOrgId?: string,
    required = true,
  ): string | undefined {
    if (requestedOrgId && userOrgId && requestedOrgId !== userOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Access denied: cannot access email resources of another organization.",
        { organizationId: requestedOrgId },
      );
    }
    const orgId = userOrgId || requestedOrgId || undefined;
    if (required && !orgId) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.EMAIL_ORG_REQUIRED,
        "Organization ID is required",
      );
    }
    return orgId;
  }

  async getSettings(organizationId?: string, userOrgId?: string | null) {
    const targetOrgId = this.resolveOrgId(userOrgId, organizationId, false);
    if (!targetOrgId) {
      return null;
    }

    let settings = await this.prisma.emailSetting.findFirst({
      where: { organizationId: targetOrgId },
    });

    if (!settings) {
      settings = await this.prisma.emailSetting.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: targetOrgId,
          provider: "SIMULATED",
          fromName: "Recruitment Team",
          fromEmail: "careers@workspace.com",
          smtpHost: null,
          smtpPort: null,
          smtpUser: null,
          smtpPass: null,
          resendApiKey: null,
          sendgridApiKey: null,
          updatedAt: toInstant(),
        },
      });
    }

    return {
      ...settings,
      smtpPass: this.encryptionService.mask(settings.smtpPass),
      resendApiKey: this.encryptionService.mask(settings.resendApiKey),
      sendgridApiKey: this.encryptionService.mask(settings.sendgridApiKey),
    };
  }

  async getRawSettings(organizationId: string) {
    if (!organizationId) {
      return null;
    }

    const settings = await this.prisma.emailSetting.findFirst({
      where: { organizationId },
    });

    if (!settings) {
      return null;
    }

    try {
      return {
        ...settings,
        smtpPass: this.encryptionService.decrypt(settings.smtpPass),
        resendApiKey: this.encryptionService.decrypt(settings.resendApiKey),
        sendgridApiKey: this.encryptionService.decrypt(settings.sendgridApiKey),
      };
    } catch {
      throw new AppBadRequestException(
        APP_ERROR_CODES.EMAIL_SETTINGS_INVALID,
        "Saved email credentials could not be decrypted. Save them again before sending email.",
      );
    }
  }

  async requireDeliverySettings(organizationId: string) {
    const settings = await this.getRawSettings(organizationId);
    if (!settings) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.EMAIL_SETTINGS_NOT_FOUND,
        "Configure organization email settings before sending recruitment email.",
      );
    }

    const validSmtp =
      settings.provider === "SMTP" &&
      settings.smtpHost?.trim() &&
      settings.smtpUser?.trim() &&
      settings.smtpPass?.trim() &&
      settings.smtpPort !== null &&
      Number.isInteger(settings.smtpPort) &&
      settings.smtpPort >= 1 &&
      settings.smtpPort <= 65535;
    const validResend =
      settings.provider === "RESEND" && settings.resendApiKey?.trim();
    const validSendGrid =
      settings.provider === "SENDGRID" && settings.sendgridApiKey?.trim();
    const allowSimulation =
      settings.provider === "SIMULATED" && env.NODE_ENV !== "production";

    if (
      !settings.fromName.trim() ||
      !isEmail(settings.fromEmail) ||
      !(validSmtp || validResend || validSendGrid || allowSimulation)
    ) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.EMAIL_SETTINGS_INVALID,
        "Configure a valid sender and provider credentials before sending recruitment email.",
      );
    }

    return settings;
  }

  async updateSettings(
    organizationId: string | undefined,
    dto: UpdateEmailSettingDto,
    userOrgId?: string | null,
  ) {
    const targetOrgId = this.resolveOrgId(userOrgId, organizationId, true)!;
    const rawCurrent = await this.prisma.emailSetting.findFirst({
      where: { organizationId: targetOrgId },
    });

    const currentId =
      rawCurrent?.id || (await this.getSettings(targetOrgId))?.id;

    if (!currentId) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.EMAIL_SETTINGS_NOT_FOUND,
        "Email settings not found",
      );
    }

    interface EmailSettingUpdatePayload {
      provider?: string;
      fromName?: string;
      fromEmail?: string;
      smtpHost?: string | null;
      smtpPort?: number | null;
      smtpUser?: string | null;
      smtpPass?: string | null;
      resendApiKey?: string | null;
      sendgridApiKey?: string | null;
    }

    const updateData: EmailSettingUpdatePayload = {};
    if (dto.provider !== undefined) updateData.provider = dto.provider;
    if (dto.fromName !== undefined) updateData.fromName = dto.fromName;
    if (dto.fromEmail !== undefined) updateData.fromEmail = dto.fromEmail;
    if (dto.smtpHost !== undefined) updateData.smtpHost = dto.smtpHost;
    if (dto.smtpPort !== undefined) updateData.smtpPort = dto.smtpPort;
    if (dto.smtpUser !== undefined) updateData.smtpUser = dto.smtpUser;

    // Credentials handling with AES-256-GCM encryption
    if (dto.smtpPass !== undefined) {
      if (dto.smtpPass && !dto.smtpPass.startsWith("•")) {
        updateData.smtpPass = this.encryptionService.encrypt(dto.smtpPass);
      } else if (!dto.smtpPass) {
        updateData.smtpPass = null;
      }
    }
    if (dto.resendApiKey !== undefined) {
      if (dto.resendApiKey && !dto.resendApiKey.startsWith("•")) {
        updateData.resendApiKey = this.encryptionService.encrypt(
          dto.resendApiKey,
        );
      } else if (!dto.resendApiKey) {
        updateData.resendApiKey = null;
      }
    }
    if (dto.sendgridApiKey !== undefined) {
      if (dto.sendgridApiKey && !dto.sendgridApiKey.startsWith("•")) {
        updateData.sendgridApiKey = this.encryptionService.encrypt(
          dto.sendgridApiKey,
        );
      } else if (!dto.sendgridApiKey) {
        updateData.sendgridApiKey = null;
      }
    }

    await this.prisma.emailSetting.update({
      where: { id: currentId },
      data: updateData,
    });

    return this.getSettings(targetOrgId);
  }
}
