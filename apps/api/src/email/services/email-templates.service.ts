import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import {
  type EmailTemplateType,
  DEFAULT_TEMPLATES,
  APP_ERROR_CODES,
} from "@haihire/shared";
import { AppNotFoundException } from "../../common/app-exception";
import { PrismaService } from "../../prisma/prisma.service";
import { EmailSettingsService } from "./email-settings.service";
import { UpdateEmailTemplateDto } from "../dto/update-template.dto";
import { toTimestamp, toInstant } from "../../common/date.util";

export interface EnrichedEmailTemplate {
  id: string;
  organizationId: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class EmailTemplatesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EmailSettingsService)
    private readonly settingsService: EmailSettingsService,
  ) {}

  async getTemplates(
    organizationId?: string,
    userOrgId?: string | null,
  ): Promise<EnrichedEmailTemplate[]> {
    const targetOrgId = this.settingsService.resolveOrgId(
      userOrgId,
      organizationId,
      false,
    );
    if (!targetOrgId) {
      return [];
    }

    const templates = await this.prisma.emailTemplate.findMany({
      where: { organizationId: targetOrgId },
    });

    if (templates.length === 0) {
      return this.seedDefaultTemplates(targetOrgId);
    }

    return templates.map((t) => ({
      ...t,
      variables: t.variables ? (JSON.parse(t.variables) as string[]) : [],
      createdAt: new Date(toTimestamp(t.createdAt)),
      updatedAt: new Date(toTimestamp(t.updatedAt)),
    }));
  }

  async seedDefaultTemplates(
    organizationId: string,
  ): Promise<EnrichedEmailTemplate[]> {
    const created: EnrichedEmailTemplate[] = [];
    for (const def of DEFAULT_TEMPLATES) {
      const item = await this.prisma.emailTemplate.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          type: def.type,
          name: def.name,
          subject: def.subject,
          body: def.body,
          enabled: true,
          variables: JSON.stringify(def.variables),
          updatedAt: toInstant(),
        },
      });
      created.push({
        ...item,
        variables: def.variables,
        createdAt: new Date(toTimestamp(item.createdAt)),
        updatedAt: new Date(toTimestamp(item.updatedAt)),
      });
    }
    return created;
  }

  async getTemplateByType(
    organizationId: string,
    type: string,
  ): Promise<EnrichedEmailTemplate | undefined> {
    const templates = await this.getTemplates(organizationId);
    return templates.find((t) => t.type === type);
  }

  async updateTemplate(
    organizationId: string | undefined,
    type: string,
    dto: UpdateEmailTemplateDto,
    userOrgId?: string | null,
  ) {
    const targetOrgId = this.settingsService.resolveOrgId(
      userOrgId,
      organizationId,
      true,
    )!;
    const existing = await this.prisma.emailTemplate.findFirst({
      where: {
        organizationId: targetOrgId,
        type: type as EmailTemplateType,
      },
    });

    if (!existing) {
      await this.seedDefaultTemplates(targetOrgId);
    }

    const current = await this.prisma.emailTemplate.findFirst({
      where: {
        organizationId: targetOrgId,
        type: type as EmailTemplateType,
      },
    });

    if (!current) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.EMAIL_TEMPLATE_NOT_FOUND,
        `Template ${type} not found`,
        { templateType: type },
      );
    }

    const updateData: {
      subject?: string;
      body?: string;
      enabled?: boolean;
    } = {};
    if (dto.subject !== undefined) updateData.subject = dto.subject;
    if (dto.body !== undefined) updateData.body = dto.body;
    if (dto.enabled !== undefined) updateData.enabled = dto.enabled;

    await this.prisma.emailTemplate.update({
      where: { id: current.id },
      data: updateData,
    });

    const updated = await this.prisma.emailTemplate.findFirst({
      where: { id: current.id },
    });

    return {
      ...updated,
      variables: updated?.variables
        ? (JSON.parse(updated.variables) as string[])
        : [],
      createdAt: updated?.createdAt
        ? new Date(toTimestamp(updated.createdAt))
        : new Date(),
      updatedAt: updated?.updatedAt
        ? new Date(toTimestamp(updated.updatedAt))
        : new Date(),
    };
  }
}
