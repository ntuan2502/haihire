import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import { EmailTemplateType as PrismaEmailTemplateType } from "@prisma/client";
import {
  type EmailTemplateType,
  DEFAULT_TEMPLATES,
  APP_ERROR_CODES,
} from "@haihire/shared";
import {
  AppBadRequestException,
  AppNotFoundException,
} from "../../common/app-exception";
import { PrismaService } from "../../prisma/prisma.service";
import { EmailSettingsService } from "./email-settings.service";
import { CreateEmailTemplateDto } from "../dto/create-template.dto";
import {
  DuplicateEmailTemplateDto,
  UpdateEmailTemplateDto,
} from "../dto/update-template.dto";
import { toTimestamp, toInstant } from "../../common/date.util";
import { EventsService } from "../../events/events.service";

export interface EnrichedEmailTemplate {
  id: string;
  organizationId: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  isSystem: boolean;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TEMPLATE_TYPE_ORDER: Record<string, number> = {
  APPLICATION_CONFIRMATION: 0,
  INTERVIEW_INVITATION: 1,
  REJECTION: 2,
  OFFER: 3,
  CUSTOM: 4,
};

function isEmailTemplateType(value: string): value is EmailTemplateType {
  return value in TEMPLATE_TYPE_ORDER;
}

function extractVariables(subject: string, body: string): string[] {
  const combined = `${subject}\n${body}`;
  const seen = new Set<string>();
  const ordered: string[] = [];
  const regex = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
  let match = regex.exec(combined);
  while (match !== null) {
    const key = match[1];
    if (key && !seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
    match = regex.exec(combined);
  }
  return ordered;
}

function toEnrichedTemplate(raw: {
  id: string;
  organizationId: string;
  type: string;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  isSystem?: boolean;
  variables: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): EnrichedEmailTemplate {
  let parsedVars: string[] = [];
  if (raw.variables) {
    try {
      const candidate = JSON.parse(raw.variables);
      if (Array.isArray(candidate)) {
        parsedVars = candidate.filter(
          (v): v is string => typeof v === "string",
        );
      }
    } catch {
      parsedVars = extractVariables(raw.subject, raw.body);
    }
  }
  return {
    id: raw.id,
    organizationId: raw.organizationId,
    type: raw.type as EmailTemplateType,
    name: raw.name,
    subject: raw.subject,
    body: raw.body,
    enabled: raw.enabled,
    isSystem: Boolean(raw.isSystem),
    variables: parsedVars,
    createdAt: new Date(toTimestamp(raw.createdAt)),
    updatedAt: new Date(toTimestamp(raw.updatedAt)),
  };
}

function sortTemplates(
  items: EnrichedEmailTemplate[],
): EnrichedEmailTemplate[] {
  return [...items].sort((a, b) => {
    if (a.isSystem !== b.isSystem) {
      return a.isSystem ? -1 : 1;
    }
    if (a.isSystem && b.isSystem) {
      const orderDiff =
        (TEMPLATE_TYPE_ORDER[a.type] ?? 99) -
        (TEMPLATE_TYPE_ORDER[b.type] ?? 99);
      if (orderDiff !== 0) return orderDiff;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

@Injectable()
export class EmailTemplatesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EmailSettingsService)
    private readonly settingsService: EmailSettingsService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
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

    return sortTemplates(templates.map(toEnrichedTemplate));
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
          type: def.type as PrismaEmailTemplateType,
          name: def.name,
          subject: def.subject,
          body: def.body,
          enabled: true,
          isSystem: true,
          variables: JSON.stringify(def.variables),
          updatedAt: toInstant(),
        },
      });
      created.push({
        ...toEnrichedTemplate(item),
        variables: def.variables,
      });
    }
    return sortTemplates(created);
  }

  async getTemplateById(
    organizationId: string,
    id: string,
  ): Promise<EnrichedEmailTemplate | undefined> {
    const found = await this.prisma.emailTemplate.findFirst({
      where: { id, organizationId },
    });
    return found ? toEnrichedTemplate(found) : undefined;
  }

  async getTemplateByType(
    organizationId: string,
    type: string,
  ): Promise<EnrichedEmailTemplate | undefined> {
    const templates = await this.getTemplates(organizationId);
    return (
      templates.find((t) => t.type === type && t.isSystem) ??
      templates.find((t) => t.type === type)
    );
  }

  async createTemplate(
    organizationId: string | undefined,
    dto: CreateEmailTemplateDto,
    userOrgId?: string | null,
  ): Promise<EnrichedEmailTemplate> {
    const targetOrgId = this.settingsService.resolveOrgId(
      userOrgId,
      organizationId,
      true,
    )!;

    const existing = await this.prisma.emailTemplate.findMany({
      where: { organizationId: targetOrgId },
    });
    if (existing.length === 0) {
      await this.seedDefaultTemplates(targetOrgId);
    }

    const variables = extractVariables(dto.subject, dto.body);
    const created = await this.prisma.emailTemplate.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: targetOrgId,
        type: (dto.type ?? "CUSTOM") as PrismaEmailTemplateType,
        name: dto.name.trim(),
        subject: dto.subject,
        body: dto.body,
        enabled: dto.enabled ?? true,
        isSystem: false,
        variables: JSON.stringify(variables),
        updatedAt: toInstant(),
      },
    });

    this.eventsService?.emit({
      type: "EMAIL_CHANGED",
      organizationId: targetOrgId,
      data: { templateId: created.id },
    });

    return toEnrichedTemplate(created);
  }

  async updateTemplate(
    organizationId: string | undefined,
    idOrType: string,
    dto: UpdateEmailTemplateDto,
    userOrgId?: string | null,
  ): Promise<EnrichedEmailTemplate> {
    const targetOrgId = this.settingsService.resolveOrgId(
      userOrgId,
      organizationId,
      true,
    )!;

    let current = await this.prisma.emailTemplate.findFirst({
      where: {
        organizationId: targetOrgId,
        id: idOrType,
      },
    });

    if (!current && isEmailTemplateType(idOrType)) {
      const existing = await this.prisma.emailTemplate.findMany({
        where: { organizationId: targetOrgId },
      });
      if (existing.length === 0) {
        await this.seedDefaultTemplates(targetOrgId);
      }

      const matches = await this.prisma.emailTemplate.findMany({
        where: {
          organizationId: targetOrgId,
          type: idOrType as PrismaEmailTemplateType,
        },
      });
      current = matches.find((t) => Boolean(t.isSystem)) ?? matches[0] ?? null;
    }

    if (!current) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.EMAIL_TEMPLATE_NOT_FOUND,
        `Template ${idOrType} not found`,
        { templateId: idOrType },
      );
    }

    const nextSubject =
      dto.subject !== undefined ? dto.subject : current.subject;
    const nextBody = dto.body !== undefined ? dto.body : current.body;

    const updateData: {
      name?: string;
      type?: PrismaEmailTemplateType;
      subject?: string;
      body?: string;
      enabled?: boolean;
      variables?: string;
      updatedAt: Date;
    } = {
      updatedAt: toInstant(),
    };
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.subject !== undefined) updateData.subject = dto.subject;
    if (dto.body !== undefined) updateData.body = dto.body;
    if (dto.enabled !== undefined) updateData.enabled = dto.enabled;
    if (dto.subject !== undefined || dto.body !== undefined) {
      updateData.variables = JSON.stringify(
        extractVariables(nextSubject, nextBody),
      );
    }

    await this.prisma.emailTemplate.updateMany({
      where: { id: current.id, organizationId: targetOrgId },
      data: updateData,
    });

    this.eventsService?.emit({
      type: "EMAIL_CHANGED",
      organizationId: targetOrgId,
      data: {
        templateId: current.id,
        templateType: updateData.type ?? current.type,
      },
    });

    const updated = await this.prisma.emailTemplate.findFirst({
      where: { id: current.id, organizationId: targetOrgId },
    });

    return toEnrichedTemplate(updated ?? { ...current, ...updateData });
  }

  async duplicateTemplate(
    organizationId: string | undefined,
    id: string,
    dto?: DuplicateEmailTemplateDto,
    userOrgId?: string | null,
  ): Promise<EnrichedEmailTemplate> {
    const targetOrgId = this.settingsService.resolveOrgId(
      userOrgId,
      organizationId,
      true,
    )!;

    const source = await this.prisma.emailTemplate.findFirst({
      where: { id, organizationId: targetOrgId },
    });
    if (!source) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.EMAIL_TEMPLATE_NOT_FOUND,
        `Template ${id} not found`,
        { templateId: id },
      );
    }

    const copyName = dto?.name?.trim() || `${source.name} (Copy)`;
    const created = await this.prisma.emailTemplate.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: targetOrgId,
        type: source.type,
        name: copyName,
        subject: source.subject,
        body: source.body,
        enabled: source.enabled,
        isSystem: false,
        variables: source.variables,
        updatedAt: toInstant(),
      },
    });

    this.eventsService?.emit({
      type: "EMAIL_CHANGED",
      organizationId: targetOrgId,
      data: { templateId: created.id },
    });

    return toEnrichedTemplate(created);
  }

  async deleteTemplate(
    organizationId: string | undefined,
    id: string,
    userOrgId?: string | null,
  ): Promise<{ deleted: true; id: string }> {
    const targetOrgId = this.settingsService.resolveOrgId(
      userOrgId,
      organizationId,
      true,
    )!;

    const current = await this.prisma.emailTemplate.findFirst({
      where: { id, organizationId: targetOrgId },
    });
    if (!current) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.EMAIL_TEMPLATE_NOT_FOUND,
        `Template ${id} not found`,
        { templateId: id },
      );
    }

    if (current.isSystem) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.EMAIL_TEMPLATE_SYSTEM_PROTECTED,
        "System email templates cannot be deleted",
        { templateId: id },
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (tx.emailFlowConfig) {
        await tx.emailFlowConfig.updateMany({
          where: { organizationId: targetOrgId, templateId: id },
          data: {
            templateId: null,
            enabled: false,
            updatedAt: toInstant(),
          },
        });
      }
      await tx.emailTemplate.deleteMany({
        where: { id, organizationId: targetOrgId },
      });
    });

    this.eventsService?.emit({
      type: "EMAIL_CHANGED",
      organizationId: targetOrgId,
      data: { deletedTemplateId: id },
    });

    return { deleted: true, id };
  }
}
