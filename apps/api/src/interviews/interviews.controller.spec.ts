import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@haihire/shared";
import { InterviewsController } from "./interviews.controller";
import type { InterviewsService } from "./interviews.service";
import { ActivitiesController } from "../activities/activities.controller";
import { EmailController } from "../email/email.controller";
import { ActiveTenantGuard } from "../common/guards/active-tenant.guard";
import { RolesGuard } from "../auth/roles.guard";
import { DtoPipe } from "../common/dto-validation.pipe";
import { SubmitScorecardDto } from "./dto/submit-scorecard.dto";

describe("Tenant read authorization regressions", () => {
  it.each([InterviewsController, ActivitiesController])(
    "%s requires an active organization before reading data",
    (controller) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller);
      expect(guards).toContain(ActiveTenantGuard);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { organizationId: null } }),
        }),
      } as unknown as ExecutionContext;
      expect(() => new ActiveTenantGuard().canActivate(context)).toThrow();
    },
  );

  it.each([
    [EmailController, "getLogs", Role.INTERVIEWER],
    [EmailController, "getTemplates", Role.INTERVIEWER],
    [EmailController, "getSettings", Role.INTERVIEWER],
    [EmailController, "getVariables", Role.INTERVIEWER],
  ] as const)(
    "%s.%s rejects a role without read permission",
    (controller, method, role) => {
      const handler = Object.getOwnPropertyDescriptor(
        controller.prototype,
        method,
      )?.value;
      const guards = [
        ...(Reflect.getMetadata(GUARDS_METADATA, controller) ?? []),
        ...(Reflect.getMetadata(GUARDS_METADATA, handler) ?? []),
      ];
      expect(guards).toContain(RolesGuard);
      const context = {
        getClass: () => controller,
        getHandler: () => handler,
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: "reader", role } }),
        }),
      } as unknown as ExecutionContext;
      expect(() =>
        new RolesGuard(new Reflector()).canActivate(context),
      ).toThrow();
    },
  );
});

describe("Scorecard endpoint field isolation", () => {
  it("strips scheduling fields and forwards only the scorecard", async () => {
    const dto = await DtoPipe(SubmitScorecardDto).transform(
      {
        scorecard: { rating: 4 },
        date: "2030-01-01",
        interviewer: "attacker",
        notes: "changed",
      },
      { type: "body", metatype: SubmitScorecardDto },
    );
    expect(dto).toEqual({ scorecard: { rating: 4 } });
    const update = vi.fn();
    const controller = new InterviewsController({
      update,
    } as unknown as InterviewsService);
    controller.submitScorecard("interview-1", dto, {
      user: { organizationId: "org-1" },
    });
    expect(update).toHaveBeenCalledWith(
      "interview-1",
      { scorecard: { rating: 4 } },
      "org-1",
    );
  });

  it("rejects requests without a scorecard", async () => {
    await expect(
      DtoPipe(SubmitScorecardDto).transform(
        { date: "2030-01-01" },
        { type: "body", metatype: SubmitScorecardDto },
      ),
    ).rejects.toThrow();
  });
});
