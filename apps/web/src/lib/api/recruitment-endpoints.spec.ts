import { describe, it, expect, vi, beforeEach } from "vitest";
import { SourcingChannel } from "@haihire/shared";

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
  getApiBaseUrl: vi.fn(() => "/api"),
}));

import { jobsApi } from "./jobs";
import { candidatesApi } from "./candidates";
import { applicationsApi } from "./applications";
import { interviewsApi } from "./interviews";
import { sourcingApi } from "./sourcing";

describe("Recruitment Web API Clients (jobs, candidates, applications, interviews, sourcing)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: { ok: true } });
    mockApi.post.mockResolvedValue({ data: { ok: true } });
    mockApi.patch.mockResolvedValue({ data: { ok: true } });
    mockApi.delete.mockResolvedValue({ data: { ok: true } });
  });

  describe("jobsApi", () => {
    it("covers public, workspace CRUD, stages, and AI generation endpoints", async () => {
      await jobsApi.getPublic({ limit: 6 });
      expect(mockApi.get).toHaveBeenCalledWith("/jobs/public", {
        params: { limit: 6 },
      });

      await jobsApi.getAll({ status: "OPEN", search: "nest", page: 1 });
      expect(mockApi.get).toHaveBeenCalledWith("/jobs", {
        params: { status: "OPEN", search: "nest", page: 1 },
      });

      await jobsApi.getById("job-1");
      expect(mockApi.get).toHaveBeenCalledWith("/jobs/job-1");

      await jobsApi.getBySlug("acme", "backend-engineer");
      expect(mockApi.get).toHaveBeenCalledWith(
        "/jobs/careers/acme/backend-engineer",
      );

      await jobsApi.create({ title: "Backend" } as never);
      expect(mockApi.post).toHaveBeenCalledWith("/jobs", { title: "Backend" });

      await jobsApi.update("job-1", { title: "Senior Backend" });
      expect(mockApi.patch).toHaveBeenCalledWith("/jobs/job-1", {
        title: "Senior Backend",
      });

      await jobsApi.delete("job-1");
      expect(mockApi.delete).toHaveBeenCalledWith("/jobs/job-1");

      await jobsApi.getStages("job-1");
      expect(mockApi.get).toHaveBeenCalledWith("/jobs/job-1/stages");

      await jobsApi.updateStages("job-1", { stages: [] } as never);
      expect(mockApi.patch).toHaveBeenCalledWith("/jobs/job-1/stages", {
        stages: [],
      });

      await jobsApi.generateScreeningQuestions({ title: "Backend" } as never);
      expect(mockApi.post).toHaveBeenCalledWith(
        "/jobs/screening-questions/generate",
        { title: "Backend" },
      );

      await jobsApi.generateScoringCriteria({ title: "Backend" } as never);
      expect(mockApi.post).toHaveBeenCalledWith(
        "/jobs/generate-scoring-criteria",
        { title: "Backend" },
      );
    });
  });

  describe("candidatesApi", () => {
    it("covers candidate CRUD, duplicate check filtering, documents, download URL, and notes", async () => {
      await candidatesApi.listPaginated({ page: 1, sortBy: "name" });
      expect(mockApi.get).toHaveBeenCalledWith("/candidates", {
        params: { page: 1, sortBy: "name" },
      });

      await candidatesApi.getById("cand-1");
      expect(mockApi.get).toHaveBeenCalledWith("/candidates/cand-1");

      await candidatesApi.checkDuplicates({
        email: "alice@example.com",
        phone: "   ",
      });
      expect(mockApi.get).toHaveBeenCalledWith("/candidates/check-duplicate", {
        params: { email: "alice@example.com" },
      });

      const createForm = new FormData();
      createForm.append("firstName", "Alice");
      await candidatesApi.create(createForm);
      expect(mockApi.post).toHaveBeenCalledWith("/candidates", createForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await candidatesApi.update("cand-1", { firstName: "Alicia" } as never);
      expect(mockApi.patch).toHaveBeenCalledWith("/candidates/cand-1", {
        firstName: "Alicia",
      });

      await candidatesApi.delete("cand-1");
      expect(mockApi.delete).toHaveBeenCalledWith("/candidates/cand-1");

      const docFile = new File(["pdf"], "cv.pdf", { type: "application/pdf" });
      await candidatesApi.uploadDocument("cand-1", docFile, "RESUME");
      const [docUrl, docBody, docCfg] = mockApi.post.mock.calls.at(-1)!;
      expect(docUrl).toBe("/candidates/cand-1/documents");
      expect(docBody).toBeInstanceOf(FormData);
      expect(docCfg).toEqual({
        params: { type: "RESUME" },
        headers: { "Content-Type": "multipart/form-data" },
      });

      await candidatesApi.deleteDocument("cand-1", { documentId: "doc-1" });
      expect(mockApi.delete).toHaveBeenCalledWith(
        "/candidates/cand-1/documents",
        {
          params: { documentId: "doc-1" },
        },
      );

      expect(
        candidatesApi.getDocumentDownloadUrl(
          "cand-1",
          "/tenants/o1/cv.pdf",
          "Alice CV.pdf",
        ),
      ).toBe(
        "/api/candidates/cand-1/documents/download?url=%2Ftenants%2Fo1%2Fcv.pdf&name=Alice%20CV.pdf",
      );

      await candidatesApi.getNotes("cand-1");
      expect(mockApi.get).toHaveBeenCalledWith("/candidates/cand-1/notes");

      await candidatesApi.addNote("cand-1", "Strong TS");
      expect(mockApi.post).toHaveBeenCalledWith("/candidates/cand-1/notes", {
        content: "Strong TS",
      });

      await candidatesApi.updateNote("cand-1", "n-1", "Updated");
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/candidates/cand-1/notes/n-1",
        { content: "Updated" },
      );

      await candidatesApi.deleteNote("cand-1", "n-1");
      expect(mockApi.delete).toHaveBeenCalledWith(
        "/candidates/cand-1/notes/n-1",
      );
    });
  });

  describe("applicationsApi", () => {
    it("covers applications query, public apply, stage transitions, documents, notes, and AI scoring", async () => {
      await applicationsApi.listPaginated({ stage: "APPLIED" });
      expect(mockApi.get).toHaveBeenCalledWith("/applications", {
        params: { stage: "APPLIED" },
      });

      await applicationsApi.getStats();
      expect(mockApi.get).toHaveBeenLastCalledWith("/applications/stats", {
        params: undefined,
      });

      await applicationsApi.getStats("org-1");
      expect(mockApi.get).toHaveBeenLastCalledWith("/applications/stats", {
        params: { organizationId: "org-1" },
      });

      await applicationsApi.getByJob("job-1", { limit: 10, offset: 0 });
      expect(mockApi.get).toHaveBeenCalledWith("/applications/job/job-1", {
        params: { limit: 10, offset: 0 },
      });

      await applicationsApi.getById("app-1");
      expect(mockApi.get).toHaveBeenCalledWith("/applications/app-1");

      const applyForm = new FormData();
      applyForm.append("jobId", "job-1");
      await applicationsApi.apply(applyForm);
      expect(mockApi.post).toHaveBeenCalledWith(
        "/applications/apply",
        applyForm,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      await applicationsApi.updateStage("app-1", "SCREENING", 2);
      expect(mockApi.patch).toHaveBeenLastCalledWith(
        "/applications/app-1/stage",
        { stage: "SCREENING", orderIndex: 2 },
      );

      await applicationsApi.updateStage("app-1", {
        stage: "REJECTED",
        stageId: "st-9",
        rejectionReason: "Culture fit",
        sendRejectionEmail: true,
        emailTemplateId: "tpl-1",
      });
      expect(mockApi.patch).toHaveBeenLastCalledWith(
        "/applications/app-1/stage",
        {
          stage: "REJECTED",
          stageId: "st-9",
          orderIndex: 0,
          rejectionReason: "Culture fit",
          sendRejectionEmail: true,
          emailTemplateId: "tpl-1",
        },
      );

      await applicationsApi.updateCandidate("app-1", { firstName: "Bob" });
      expect(mockApi.patch).toHaveBeenCalledWith("/applications/app-1", {
        firstName: "Bob",
      });

      const appFile = new File(["cv"], "resume.pdf", {
        type: "application/pdf",
      });
      await applicationsApi.uploadDocument("app-1", appFile);
      expect(mockApi.post).toHaveBeenLastCalledWith(
        "/applications/app-1/documents",
        expect.any(FormData),
        {
          params: undefined,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      await applicationsApi.deleteDocument("app-1", { url: "/a.pdf" });
      expect(mockApi.delete).toHaveBeenCalledWith(
        "/applications/app-1/documents",
        { params: { url: "/a.pdf" } },
      );

      await applicationsApi.delete("app-1");
      expect(mockApi.delete).toHaveBeenCalledWith("/applications/app-1");

      await applicationsApi.getNotes("app-1");
      expect(mockApi.get).toHaveBeenCalledWith("/applications/app-1/notes");

      await applicationsApi.addNote("app-1", "Note 1");
      expect(mockApi.post).toHaveBeenCalledWith("/applications/app-1/notes", {
        content: "Note 1",
      });

      await applicationsApi.updateNote("app-1", "n-1", "Note 2");
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/applications/app-1/notes/n-1",
        { content: "Note 2" },
      );

      await applicationsApi.deleteNote("app-1", "n-1");
      expect(mockApi.delete).toHaveBeenCalledWith(
        "/applications/app-1/notes/n-1",
      );

      await applicationsApi.triggerAiScore("app-1");
      expect(mockApi.post).toHaveBeenCalledWith("/applications/app-1/ai-score");

      await applicationsApi.triggerJobBatchAiScore("job-1");
      expect(mockApi.post).toHaveBeenLastCalledWith(
        "/applications/job/job-1/ai-score-batch",
        { limit: 20 },
      );
    });
  });

  describe("interviewsApi & sourcingApi", () => {
    it("covers interview scheduling, scorecards, sourcing analytics, and tracking links", async () => {
      await interviewsApi.getAll({ jobId: "job-1" });
      expect(mockApi.get).toHaveBeenCalledWith("/interviews", {
        params: { jobId: "job-1" },
      });

      await interviewsApi.getById("int-1");
      expect(mockApi.get).toHaveBeenCalledWith("/interviews/int-1");

      await interviewsApi.create({ applicationId: "app-1" } as never);
      expect(mockApi.post).toHaveBeenCalledWith("/interviews", {
        applicationId: "app-1",
      });

      await interviewsApi.update("int-1", { location: "Meet" } as never);
      expect(mockApi.patch).toHaveBeenCalledWith("/interviews/int-1", {
        location: "Meet",
      });

      await interviewsApi.submitScorecard("int-1", { overallRating: 5 });
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/interviews/int-1/scorecard",
        { scorecard: { overallRating: 5 } },
      );

      await interviewsApi.delete("int-1");
      expect(mockApi.delete).toHaveBeenCalledWith("/interviews/int-1");

      await sourcingApi.getStats({ timeRange: "30d" });
      expect(mockApi.get).toHaveBeenCalledWith("/sourcing/stats", {
        params: { timeRange: "30d" },
      });

      await sourcingApi.getLinks({ isActive: true });
      expect(mockApi.get).toHaveBeenCalledWith("/sourcing/links", {
        params: { isActive: true },
      });

      await sourcingApi.getLinkDetails("lnk-1", { timeRange: "7d" });
      expect(mockApi.get).toHaveBeenCalledWith("/sourcing/links/lnk-1", {
        params: { timeRange: "7d" },
      });

      await sourcingApi.createLink({
        name: "LinkedIn",
        source: SourcingChannel.LINKEDIN,
      } as never);
      expect(mockApi.post).toHaveBeenCalledWith("/sourcing/links", {
        name: "LinkedIn",
        source: SourcingChannel.LINKEDIN,
      });

      await sourcingApi.updateLink("lnk-1", { isActive: false });
      expect(mockApi.patch).toHaveBeenCalledWith("/sourcing/links/lnk-1", {
        isActive: false,
      });

      await sourcingApi.deleteLink("lnk-1");
      expect(mockApi.delete).toHaveBeenCalledWith("/sourcing/links/lnk-1");

      await sourcingApi.getAttributionLog({ source: SourcingChannel.GITHUB });
      expect(mockApi.get).toHaveBeenCalledWith("/sourcing/attribution-log", {
        params: { source: SourcingChannel.GITHUB },
      });

      await sourcingApi.recordPublicClick({
        token: "trk-1",
        referrer: "https://linkedin.com",
      });
      expect(mockApi.post).toHaveBeenCalledWith("/sourcing/public/click", {
        token: "trk-1",
        referrer: "https://linkedin.com",
      });
    });
  });
});
