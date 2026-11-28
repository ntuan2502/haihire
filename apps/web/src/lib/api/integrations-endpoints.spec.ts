import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("./client", () => ({
  api: mockApi,
}));

import { emailApi } from "./email";
import { aiSettingsApi } from "./ai-settings";
import { webhookSettingsApi } from "./webhook-settings";

describe("Integrations Web API Clients (email, ai-settings, webhook-settings)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: { ok: true } });
    mockApi.post.mockResolvedValue({ data: { ok: true } });
    mockApi.patch.mockResolvedValue({ data: { ok: true } });
    mockApi.put.mockResolvedValue({ data: { ok: true } });
    mockApi.delete.mockResolvedValue({ data: { ok: true } });
  });

  describe("emailApi", () => {
    it("covers templates, flows, settings, dispatch, logs, and template variables", async () => {
      await emailApi.getTemplates("org-1");
      expect(mockApi.get).toHaveBeenCalledWith("/email/templates", {
        params: { organizationId: "org-1" },
      });

      await emailApi.createTemplate({
        name: "Offer",
        subject: "Subject",
        body: "<p>Hi</p>",
      });
      expect(mockApi.post).toHaveBeenCalledWith(
        "/email/templates",
        { name: "Offer", subject: "Subject", body: "<p>Hi</p>" },
        { params: { organizationId: undefined } },
      );

      await emailApi.updateTemplate("tpl-1", { enabled: true }, "org-1");
      expect(mockApi.put).toHaveBeenCalledWith(
        "/email/templates/tpl-1",
        { enabled: true },
        { params: { organizationId: "org-1" } },
      );

      await emailApi.duplicateTemplate("tpl-1", { name: "Copy" });
      expect(mockApi.post).toHaveBeenCalledWith(
        "/email/templates/tpl-1/duplicate",
        { name: "Copy" },
        { params: { organizationId: undefined } },
      );

      await emailApi.deleteTemplate("tpl-1", "org-1");
      expect(mockApi.delete).toHaveBeenCalledWith("/email/templates/tpl-1", {
        params: { organizationId: "org-1" },
      });

      await emailApi.getFlows("org-1");
      expect(mockApi.get).toHaveBeenCalledWith("/email/flows", {
        params: { organizationId: "org-1" },
      });

      await emailApi.updateFlow("APPLICATION_CONFIRMATION", {
        templateId: "tpl-2",
        enabled: true,
      });
      expect(mockApi.put).toHaveBeenCalledWith(
        "/email/flows/APPLICATION_CONFIRMATION",
        { templateId: "tpl-2", enabled: true },
        { params: { organizationId: undefined } },
      );

      await emailApi.getSettings();
      expect(mockApi.get).toHaveBeenCalledWith("/email/settings", {
        params: { organizationId: undefined },
      });

      await emailApi.updateSettings({ senderName: "HR" }, "org-1");
      expect(mockApi.put).toHaveBeenCalledWith(
        "/email/settings",
        { senderName: "HR" },
        { params: { organizationId: "org-1" } },
      );

      await emailApi.sendEmail({
        to: "a@example.com",
        recipientName: "Alice",
        subject: "Subj",
        body: "Body",
      });
      expect(mockApi.post).toHaveBeenCalledWith(
        "/email/send",
        {
          to: "a@example.com",
          recipientName: "Alice",
          subject: "Subj",
          body: "Body",
        },
        { params: { organizationId: undefined } },
      );

      await emailApi.sendTestEmail("qa@example.com", "org-1");
      expect(mockApi.post).toHaveBeenCalledWith(
        "/email/test",
        { to: "qa@example.com" },
        { params: { organizationId: "org-1" } },
      );

      await emailApi.getLogs({
        organizationId: null,
        candidateId: "cand-1",
        page: 1,
        limit: 20,
        status: "SENT",
      });
      expect(mockApi.get).toHaveBeenCalledWith("/email/logs", {
        params: {
          organizationId: undefined,
          candidateId: "cand-1",
          page: 1,
          limit: 20,
          search: undefined,
          status: "SENT",
        },
      });

      await emailApi.getVariables();
      expect(mockApi.get).toHaveBeenCalledWith("/email/variables");
    });
  });

  describe("aiSettingsApi", () => {
    it("covers AI status, overview, policy, connections, and feature routes", async () => {
      await aiSettingsApi.getStatus();
      expect(mockApi.get).toHaveBeenCalledWith("/ai-settings/status");

      await aiSettingsApi.getOverview();
      expect(mockApi.get).toHaveBeenCalledWith("/ai-settings");

      await aiSettingsApi.updatePolicy({ isEnabled: true } as never);
      expect(mockApi.put).toHaveBeenCalledWith("/ai-settings/policy", {
        isEnabled: true,
      });

      await aiSettingsApi.createConnection({ name: "Gemini" } as never);
      expect(mockApi.post).toHaveBeenCalledWith("/ai-settings/connections", {
        name: "Gemini",
      });

      await aiSettingsApi.updateConnection("conn/1", { name: "Updated" });
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/ai-settings/connections/conn%2F1",
        { name: "Updated" },
      );

      await aiSettingsApi.deleteConnection("conn/1");
      expect(mockApi.delete).toHaveBeenCalledWith(
        "/ai-settings/connections/conn%2F1",
      );

      await aiSettingsApi.testConnection({ provider: "GOOGLE" } as never);
      expect(mockApi.post).toHaveBeenCalledWith(
        "/ai-settings/connections/test",
        { provider: "GOOGLE" },
      );

      await aiSettingsApi.updateRoutes({ routes: [] } as never);
      expect(mockApi.put).toHaveBeenCalledWith("/ai-settings/routes", {
        routes: [],
      });

      await aiSettingsApi.testRoute("CANDIDATE_SCORING");
      expect(mockApi.post).toHaveBeenCalledWith(
        "/ai-settings/routes/CANDIDATE_SCORING/test",
      );
    });
  });

  describe("webhookSettingsApi", () => {
    it("covers CRUD and test delivery endpoints", async () => {
      await webhookSettingsApi.getWebhookSettings();
      expect(mockApi.get).toHaveBeenCalledWith("/webhook-settings");

      await webhookSettingsApi.getWebhookSetting("wh-1");
      expect(mockApi.get).toHaveBeenCalledWith("/webhook-settings/wh-1");

      await webhookSettingsApi.createWebhookSetting({
        eventType: "JOB_POSTED",
        provider: "DISCORD",
        webhookUrl: "https://discord.com/api/webhooks/123/abc",
      });
      expect(mockApi.post).toHaveBeenCalledWith("/webhook-settings", {
        eventType: "JOB_POSTED",
        provider: "DISCORD",
        webhookUrl: "https://discord.com/api/webhooks/123/abc",
      });

      await webhookSettingsApi.updateWebhookSetting("wh-1", {
        isEnabled: false,
      });
      expect(mockApi.patch).toHaveBeenCalledWith("/webhook-settings/wh-1", {
        isEnabled: false,
      });

      await webhookSettingsApi.deleteWebhookSetting("wh-1");
      expect(mockApi.delete).toHaveBeenCalledWith("/webhook-settings/wh-1");

      await webhookSettingsApi.testWebhookSetting({ id: "wh-1" });
      expect(mockApi.post).toHaveBeenCalledWith("/webhook-settings/test", {
        id: "wh-1",
      });
    });
  });
});
