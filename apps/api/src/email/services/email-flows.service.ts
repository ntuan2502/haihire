import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import { EmailFlowKey as PrismaEmailFlowKey } from "@prisma/client";
import {
  APP_ERROR_CODES,
  EMAIL_FLOW_DEFINITIONS,
  EMAIL_FLOW_KEYS,
  type EmailFlowKey,
} from "@haihire/shared";
import { AppNotFoundException } from "../../common/app-exception";
import { toInstant, toTimestamp } from "../../common/date.util";
import { EventsService } from "../../events/events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateEmailFlowDto } from "../dto/update-flow.dto";
import { EmailSettingsService } from "./email-settings.service";
import {
  EmailTemplatesService,
  type EnrichedEmailTemplate,
} from "./email-templates.service";

export interface EnrichedEmailFlowConfig {
  id: string;
  organizationId: string;
  flowKey: EmailFlowKey;
  templateId: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  template: EnrichedEmailTemplate | null;
}

@Injectable()
export class EmailFlowsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EmailSettingsService)
    private readonly settingsService: EmailSettingsService,
    @Inject(EmailTemplatesService)
    private readonly templatesService: EmailTemplatesService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
  ) {}

  async getFlows(
    organizationId?: string,
    userOrgId?: string | null,
  ): Promise<EnrichedEmailFlowConfig[]> {
    const targetOrgId = this.settingsService.resolveOrgId(
      userOrgId,
      organizationId,
      false,
    );
    if (!targetOrgId) {
      return [];
    }

    const templates = await this.templatesService.getTemplates(targetOrgId);
    const existing = await this.prisma.emailFlowConfig.findMany({
      where: { organizationId: targetOrgId },
    });

    if (existing.length < EMAIL_FLOW_KEYS.length) {
      await this.seedMissingFlows(targetOrgId, templates, existing);
    }

    const [flows, refreshedTemplates] = await Promise.all([
      this.prisma.emailFlowConfig.findMany({
        where: { organizationId: targetOrgId },
      }),
      existing.length < EMAIL_FLOW_KEYS.length
        ? this.templatesService.getTemplates(targetOrgId)
        : Promise.resolve(templates),
    ]);

    const templateById = new Map(refreshedTemplates.map((t) => [t.id, t]));
    const flowOrder = new Map<EmailFlowKey, number>(
      EMAIL_FLOW_KEYS.map((key, idx) => [key, idx]),
    );

    return flows
      .map((flow) => ({
        id: flow.id,
        organizationId: flow.organizationId,
        flowKey: flow.flowKey as EmailFlowKey,
        templateId: flow.templateId,
        enabled: flow.enabled,
        createdAt: new Date(toTimestamp(flow.createdAt)),
        updatedAt: new Date(toTimestamp(flow.updatedAt)),
        template: flow.templateId
          ? (templateById.get(flow.templateId) ?? null)
          : null,
      }))
      .sort(
        (a, b) =>
          (flowOrder.get(a.flowKey) ?? 99) - (flowOrder.get(b.flowKey) ?? 99),
      );
  }

  private async seedMissingFlows(
    organizationId: string,
    templates: EnrichedEmailTemplate[],
    existing: Array<{ flowKey: PrismaEmailFlowKey | string }>,
  ): Promise<void> {
    const existingKeys = new Set(existing.map((f) => f.flowKey));

    for (const flowKey of EMAIL_FLOW_KEYS) {
      if (existingKeys.has(flowKey)) {
        continue;
      }

      const defaultType = EMAIL_FLOW_DEFINITIONS[flowKey].defaultTemplateType;
      const defaultTemplate =
        templates.find((t) => t.type === defaultType && t.isSystem) ??
        templates.find((t) => t.type === defaultType);

      try {
        await this.prisma.emailFlowConfig.create({
          data: {
            id: crypto.randomUUID(),
            organizationId,
            flowKey: flowKey as PrismaEmailFlowKey,
            templateId: defaultTemplate?.id ?? null,
            enabled: defaultTemplate ? defaultTemplate.enabled : false,
            updatedAt: toInstant(),
          },
        });
      } catch (err: unknown) {
        // Ignore unique violations caused by concurrent initialization requests
        const prismaErr = err as { code?: string };
        if (prismaErr?.code !== "P2002") {
          throw err;
        }
      }
    }
  }

  async updateFlow(
    organizationId: string | undefined,
    flowKeyParam: string,
    dto: UpdateEmailFlowDto,
    userOrgId?: string | null,
  ): Promise<EnrichedEmailFlowConfig> {
    if (!EMAIL_FLOW_KEYS.includes(flowKeyParam as EmailFlowKey)) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.EMAIL_FLOW_NOT_FOUND,
        `Email flow ${flowKeyParam} not found`,
        { flowKey: flowKeyParam },
      );
    }

    const flowKey = flowKeyParam as EmailFlowKey;
    const targetOrgId = this.settingsService.resolveOrgId(
      userOrgId,
      organizationId,
      true,
    )!;

    const currentFlows = await this.getFlows(targetOrgId);
    const existing = currentFlows.find((f) => f.flowKey === flowKey);
    if (!existing) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.EMAIL_FLOW_NOT_FOUND,
        `Email flow ${flowKey} not found`,
        { flowKey },
      );
    }

    let nextTemplateId = existing.templateId;
    if (dto.templateId !== undefined) {
      const normalized = dto.templateId ? dto.templateId.trim() : "";
      if (!normalized) {
        nextTemplateId = null;
      } else {
        const matched = await this.templatesService.getTemplateById(
          targetOrgId,
          normalized,
        );
        if (!matched) {
          throw new AppNotFoundException(
            APP_ERROR_CODES.EMAIL_TEMPLATE_NOT_FOUND,
            `Template ${normalized} not found`,
            { templateId: normalized },
          );
        }
        nextTemplateId = matched.id;
      }
    }

    const nextEnabled = nextTemplateId
      ? (dto.enabled ?? existing.enabled)
      : false;

    await this.prisma.emailFlowConfig.updateMany({
      where: {
        organizationId: targetOrgId,
        flowKey: flowKey as PrismaEmailFlowKey,
      },
      data: {
        templateId: nextTemplateId,
        enabled: nextEnabled,
        updatedAt: toInstant(),
      },
    });

    this.eventsService?.emit({
      type: "EMAIL_CHANGED",
      organizationId: targetOrgId,
      data: { flowKey },
    });

    const refreshed = await this.getFlows(targetOrgId);
    const updated = refreshed.find((f) => f.flowKey === flowKey);
    if (!updated) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.EMAIL_FLOW_NOT_FOUND,
        `Email flow ${flowKey} not found`,
        { flowKey },
      );
    }
    return updated;
  }

  async resolveFlowTemplate(
    organizationId: string,
    flowKey: EmailFlowKey,
    overrideTemplateId?: string,
  ): Promise<EnrichedEmailTemplate | undefined> {
    const trimmedOverride = overrideTemplateId?.trim();
    if (trimmedOverride) {
      const override = await this.templatesService.getTemplateById(
        organizationId,
        trimmedOverride,
      );
      if (!override || !override.enabled) {
        return undefined;
      }
      return override;
    }

    const flows = await this.getFlows(organizationId);
    const flow = flows.find((f) => f.flowKey === flowKey);
    if (!flow || !flow.enabled || !flow.template || !flow.template.enabled) {
      return undefined;
    }
    return flow.template;
  }
}
