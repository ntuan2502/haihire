import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useCreateTrackingLinkMutation,
  useUpdateTrackingLinkMutation,
  useDeleteTrackingLinkMutation,
} from "./use-sourcing-queries";
import {
  useUpdateJobMutation,
  useCreateJobMutation,
  useDeleteJobMutation,
} from "./use-job-queries";
import {
  useSwitchOrgMutation,
  useUpdateMyOrgMutation,
  useDeleteMyOrgMutation,
  useCreateInviteLinkMutation,
  useRevokeInviteLinkMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
} from "./use-organization-queries";
import {
  useCreateInterviewMutation,
  useUpdateInterviewMutation,
  useDeleteInterviewMutation,
} from "./use-interview-queries";
import {
  useUpdateEmailTemplateMutation,
  useUpdateEmailSettingsMutation,
  useSendEmailMutation,
} from "./use-email-queries";
import {
  useCreateApplicationMutation,
  useUpdateStageMutation,
  useUpdateCandidateMutation,
  useUploadDocumentMutation,
  useDeleteApplicationMutation,
  useDeleteDocumentMutation,
} from "./use-application-queries";
import {
  useCreateCandidateMutation,
  useUpdateCandidateDetailsMutation,
  useDeleteCandidateMutation,
  useUploadCandidateDocumentMutation,
  useDeleteCandidateDocumentMutation,
} from "./use-candidate-queries";
import {
  sourcingApi,
  jobsApi,
  organizationsApi,
  interviewsApi,
  emailApi,
  applicationsApi,
  candidatesApi,
} from "@/lib/api";
import { queryKeys } from "./query-keys";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", organizationId: "org-123" },
    updateUserOrg: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  sourcingApi: {
    createLink: vi.fn(),
    updateLink: vi.fn(),
    deleteLink: vi.fn(),
  },
  jobsApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
  },
  organizationsApi: {
    switchOrg: vi.fn(),
    updateMyOrg: vi.fn(),
    deleteMyOrg: vi.fn(),
    createInviteLink: vi.fn(),
    revokeInviteLink: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  },
  interviewsApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  emailApi: {
    updateTemplate: vi.fn(),
    updateSettings: vi.fn(),
    sendEmail: vi.fn(),
  },
  applicationsApi: {
    apply: vi.fn(),
    updateStage: vi.fn(),
    updateCandidate: vi.fn(),
    uploadDocument: vi.fn(),
    delete: vi.fn(),
    deleteDocument: vi.fn(),
  },
  candidatesApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      ),
  };
}

describe("Mutation Hooks onError Cache Invalidation Standardization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Domain 1: Sourcing Tracking Hooks (3 hooks)", () => {
    it("useCreateTrackingLinkMutation invalidates on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(sourcingApi.createLink).mockResolvedValueOnce({
        id: "link-1",
      } as never);

      const { result } = renderHook(() => useCreateTrackingLinkMutation(), {
        wrapper,
      });
      await result.current.mutateAsync({
        name: "LinkedIn Campaign",
        channel: "LINKEDIN",
      } as never);
      expect(spy).toHaveBeenCalledWith({ queryKey: ["sourcing"] });

      vi.mocked(sourcingApi.createLink).mockRejectedValueOnce(
        new Error("Network Error"),
      );
      await expect(
        result.current.mutateAsync({
          name: "Fail Campaign",
          channel: "LINKEDIN",
        } as never),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenLastCalledWith({ queryKey: ["sourcing"] });
    });

    it("useUpdateTrackingLinkMutation invalidates on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(sourcingApi.updateLink).mockResolvedValueOnce({
        id: "link-1",
      } as never);

      const { result } = renderHook(() => useUpdateTrackingLinkMutation(), {
        wrapper,
      });
      await result.current.mutateAsync({
        id: "link-1",
        data: { name: "Updated" },
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["sourcing"] });

      vi.mocked(sourcingApi.updateLink).mockRejectedValueOnce(
        new Error("Update failed"),
      );
      await expect(
        result.current.mutateAsync({ id: "link-1", data: { name: "Fail" } }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useDeleteTrackingLinkMutation invalidates on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(sourcingApi.deleteLink).mockResolvedValueOnce({
        success: true,
      } as never);

      const { result } = renderHook(() => useDeleteTrackingLinkMutation(), {
        wrapper,
      });
      await result.current.mutateAsync("link-1");
      expect(spy).toHaveBeenCalledWith({ queryKey: ["sourcing"] });

      vi.mocked(sourcingApi.deleteLink).mockRejectedValueOnce(
        new Error("Delete failed"),
      );
      await expect(result.current.mutateAsync("link-1")).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe("Domain 2: Job Hooks (3 hooks)", () => {
    it("useUpdateJobMutation invalidates both global and detail keys on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(jobsApi.update).mockResolvedValueOnce({
        id: "job-100",
      } as never);

      const { result } = renderHook(() => useUpdateJobMutation(), { wrapper });
      await result.current.mutateAsync({
        id: "job-100",
        data: { title: "Lead" } as never,
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["jobs"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["jobs", "job-100"] });

      vi.mocked(jobsApi.update).mockRejectedValueOnce(
        new Error("Job update failed"),
      );
      await expect(
        result.current.mutateAsync({
          id: "job-100",
          data: { title: "Lead" } as never,
        }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({ queryKey: ["jobs"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["jobs", "job-100"] });
      expect(spy).toHaveBeenCalledTimes(4);
    });

    it("useCreateJobMutation invalidates on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(jobsApi.create).mockResolvedValueOnce({
        id: "job-new",
      } as never);

      const { result } = renderHook(() => useCreateJobMutation(), { wrapper });
      await result.current.mutateAsync({ title: "New Job" } as never);
      expect(spy).toHaveBeenCalledWith({ queryKey: ["jobs"] });

      vi.mocked(jobsApi.create).mockRejectedValueOnce(
        new Error("Job create failed"),
      );
      await expect(
        result.current.mutateAsync({ title: "New Job" } as never),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useDeleteJobMutation invalidates jobs and applications on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(jobsApi.delete).mockResolvedValueOnce({
        success: true,
      } as never);

      const { result } = renderHook(() => useDeleteJobMutation(), { wrapper });
      await result.current.mutateAsync("job-100");
      expect(spy).toHaveBeenCalledWith({ queryKey: ["jobs"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });

      vi.mocked(jobsApi.delete).mockRejectedValueOnce(
        new Error("Delete failed"),
      );
      await expect(result.current.mutateAsync("job-100")).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({ queryKey: ["jobs"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledTimes(4);
    });
  });

  describe("Domain 3: Organization Hooks (7 hooks)", () => {
    it("useSwitchOrgMutation invalidates queries on success and error without infinite loops", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(organizationsApi.switchOrg).mockResolvedValueOnce({
        organization: { id: "org-2" },
        user: { role: "ADMIN" },
      } as never);

      const { result } = renderHook(() => useSwitchOrgMutation(), { wrapper });
      await result.current.mutateAsync("org-2");
      expect(spy).toHaveBeenCalledTimes(1);

      vi.mocked(organizationsApi.switchOrg).mockRejectedValueOnce(
        new Error("Forbidden 403"),
      );
      await expect(result.current.mutateAsync("org-2")).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useUpdateMyOrgMutation invalidates myOrg on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(organizationsApi.updateMyOrg).mockResolvedValueOnce({
        id: "org-1",
      } as never);

      const { result } = renderHook(() => useUpdateMyOrgMutation(), {
        wrapper,
      });
      await result.current.mutateAsync({ name: "HaiHire Corp" });
      expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.myOrg() });

      vi.mocked(organizationsApi.updateMyOrg).mockRejectedValueOnce(
        new Error("Update failed"),
      );
      await expect(
        result.current.mutateAsync({ name: "HaiHire Corp" }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useDeleteMyOrgMutation invalidates myOrg on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(organizationsApi.deleteMyOrg).mockResolvedValueOnce({
        success: true,
      } as never);

      const { result } = renderHook(() => useDeleteMyOrgMutation(), {
        wrapper,
      });
      await result.current.mutateAsync();
      expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.myOrg() });

      vi.mocked(organizationsApi.deleteMyOrg).mockRejectedValueOnce(
        new Error("Delete failed"),
      );
      await expect(result.current.mutateAsync()).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useCreateInviteLinkMutation invalidates inviteLinks on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(organizationsApi.createInviteLink).mockResolvedValueOnce({
        id: "inv-1",
      } as never);

      const { result } = renderHook(() => useCreateInviteLinkMutation(), {
        wrapper,
      });
      await result.current.mutateAsync({ role: "MEMBER" });
      expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.inviteLinks() });

      vi.mocked(organizationsApi.createInviteLink).mockRejectedValueOnce(
        new Error("Create invite failed"),
      );
      await expect(
        result.current.mutateAsync({ role: "MEMBER" }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useRevokeInviteLinkMutation invalidates inviteLinks on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(organizationsApi.revokeInviteLink).mockResolvedValueOnce({
        success: true,
      } as never);

      const { result } = renderHook(() => useRevokeInviteLinkMutation(), {
        wrapper,
      });
      await result.current.mutateAsync("inv-1");
      expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.inviteLinks() });

      vi.mocked(organizationsApi.revokeInviteLink).mockRejectedValueOnce(
        new Error("Revoke failed"),
      );
      await expect(result.current.mutateAsync("inv-1")).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useUpdateMemberRoleMutation invalidates orgMembers on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(organizationsApi.updateMemberRole).mockResolvedValueOnce({
        id: "mem-1",
      } as never);

      const { result } = renderHook(() => useUpdateMemberRoleMutation(), {
        wrapper,
      });
      await result.current.mutateAsync({ memberId: "mem-1", role: "ADMIN" });
      expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.orgMembers() });

      vi.mocked(organizationsApi.updateMemberRole).mockRejectedValueOnce(
        new Error("Update role failed"),
      );
      await expect(
        result.current.mutateAsync({ memberId: "mem-1", role: "ADMIN" }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useRemoveMemberMutation invalidates orgMembers on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(organizationsApi.removeMember).mockResolvedValueOnce({
        success: true,
      } as never);

      const { result } = renderHook(() => useRemoveMemberMutation(), {
        wrapper,
      });
      await result.current.mutateAsync("mem-1");
      expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.orgMembers() });

      vi.mocked(organizationsApi.removeMember).mockRejectedValueOnce(
        new Error("Remove failed"),
      );
      await expect(result.current.mutateAsync("mem-1")).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe("Domain 4: Interview Hooks (3 hooks)", () => {
    it("useCreateInterviewMutation invalidates interviews and applications on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(interviewsApi.create).mockResolvedValueOnce({
        id: "int-1",
      } as never);

      const { result } = renderHook(() => useCreateInterviewMutation(), {
        wrapper,
      });
      await result.current.mutateAsync({
        applicationId: "app-1",
        date: "2026-10-10",
        time: "10:00",
      } as never);
      expect(spy).toHaveBeenCalledWith({ queryKey: ["interviews"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });

      vi.mocked(interviewsApi.create).mockRejectedValueOnce(
        new Error("Conflict 409"),
      );
      await expect(
        result.current.mutateAsync({
          applicationId: "app-1",
          date: "2026-10-10",
          time: "10:00",
        } as never),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({ queryKey: ["interviews"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledTimes(4);
    });

    it("useUpdateInterviewMutation invalidates interviews, detail, and applications on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(interviewsApi.update).mockResolvedValueOnce({
        id: "int-1",
      } as never);

      const { result } = renderHook(() => useUpdateInterviewMutation(), {
        wrapper,
      });
      await result.current.mutateAsync({
        id: "int-1",
        data: { time: "11:00" } as never,
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["interviews"] });
      expect(spy).toHaveBeenCalledWith({
        queryKey: queryKeys.interview("int-1"),
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });

      vi.mocked(interviewsApi.update).mockRejectedValueOnce(
        new Error("Update failed"),
      );
      await expect(
        result.current.mutateAsync({
          id: "int-1",
          data: { time: "11:00" } as never,
        }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({ queryKey: ["interviews"] });
      expect(spy).toHaveBeenCalledWith({
        queryKey: queryKeys.interview("int-1"),
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledTimes(6);
    });

    it("useDeleteInterviewMutation invalidates interviews, applications, and candidates on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(interviewsApi.delete).mockResolvedValueOnce({
        success: true,
      } as never);

      const { result } = renderHook(() => useDeleteInterviewMutation(), {
        wrapper,
      });
      await result.current.mutateAsync("int-1");
      expect(spy).toHaveBeenCalledWith({ queryKey: ["interviews"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });

      vi.mocked(interviewsApi.delete).mockRejectedValueOnce(
        new Error("Delete failed"),
      );
      await expect(result.current.mutateAsync("int-1")).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({ queryKey: ["interviews"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });
      expect(spy).toHaveBeenCalledTimes(6);
    });
  });

  describe("Domain 5: Email Hooks (3 hooks)", () => {
    it("useUpdateEmailTemplateMutation invalidates email templates on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(emailApi.updateTemplate).mockResolvedValueOnce({
        success: true,
      } as never);

      const { result } = renderHook(() => useUpdateEmailTemplateMutation(), {
        wrapper,
      });
      await result.current.mutateAsync({
        type: "INTERVIEW_INVITATION",
        data: { subject: "Invite" },
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["email", "templates"] });

      vi.mocked(emailApi.updateTemplate).mockRejectedValueOnce(
        new Error("Template failed"),
      );
      await expect(
        result.current.mutateAsync({
          type: "INTERVIEW_INVITATION",
          data: { subject: "Invite" },
        }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useUpdateEmailSettingsMutation invalidates email settings on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(emailApi.updateSettings).mockResolvedValueOnce({
        success: true,
      } as never);

      const { result } = renderHook(() => useUpdateEmailSettingsMutation(), {
        wrapper,
      });
      await result.current.mutateAsync({ senderName: "HaiHire HR" } as never);
      expect(spy).toHaveBeenCalledWith({ queryKey: ["email", "settings"] });

      vi.mocked(emailApi.updateSettings).mockRejectedValueOnce(
        new Error("Settings failed"),
      );
      await expect(
        result.current.mutateAsync({ senderName: "HaiHire HR" } as never),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useSendEmailMutation conditionally invalidates candidate activities on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(emailApi.sendEmail).mockResolvedValueOnce({
        success: true,
      } as never);

      const { result } = renderHook(() => useSendEmailMutation(), { wrapper });
      // Case A: with candidateId
      await result.current.mutateAsync({
        to: "candidate@example.com",
        recipientName: "Candidate",
        subject: "Hello",
        body: "Body",
        candidateId: "cand-77",
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["email", "logs"] });
      expect(spy).toHaveBeenCalledWith({
        queryKey: ["activities", "candidate", "cand-77"],
      });

      // Case B: onError with candidateId
      vi.mocked(emailApi.sendEmail).mockRejectedValueOnce(
        new Error("Send failed"),
      );
      await expect(
        result.current.mutateAsync({
          to: "candidate@example.com",
          recipientName: "Candidate",
          subject: "Hello",
          body: "Body",
          candidateId: "cand-77",
        }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({ queryKey: ["email", "logs"] });
      expect(spy).toHaveBeenCalledWith({
        queryKey: ["activities", "candidate", "cand-77"],
      });

      // Case C: onError without candidateId
      vi.mocked(emailApi.sendEmail).mockRejectedValueOnce(
        new Error("Send failed again"),
      );
      await expect(
        result.current.mutateAsync({
          to: "generic@example.com",
          recipientName: "Generic",
          subject: "Hello",
          body: "Body",
        }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({ queryKey: ["email", "logs"] });
      expect(spy).toHaveBeenCalledTimes(5);
    });
  });

  describe("Domain 6: Application Hooks (6 hooks)", () => {
    it("useCreateApplicationMutation invalidates applications on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(applicationsApi.apply).mockResolvedValueOnce({
        id: "app-1",
      } as never);

      const { result } = renderHook(() => useCreateApplicationMutation(), {
        wrapper,
      });
      await result.current.mutateAsync(new FormData());
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });

      vi.mocked(applicationsApi.apply).mockRejectedValueOnce(
        new Error("Apply failed"),
      );
      await expect(
        result.current.mutateAsync(new FormData()),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useUpdateStageMutation invalidates applications on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(applicationsApi.updateStage).mockResolvedValueOnce({
        id: "app-1",
        stage: "INTERVIEW",
      } as never);

      const { result } = renderHook(() => useUpdateStageMutation(), {
        wrapper,
      });
      await result.current.mutateAsync({ id: "app-1", stage: "INTERVIEW" });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });

      vi.mocked(applicationsApi.updateStage).mockRejectedValueOnce(
        new Error("Stage conflict 409"),
      );
      await expect(
        result.current.mutateAsync({ id: "app-1", stage: "INTERVIEW" }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useUpdateCandidateMutation invalidates applications on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(applicationsApi.updateCandidate).mockResolvedValueOnce({
        id: "app-1",
      } as never);

      const { result } = renderHook(() => useUpdateCandidateMutation(), {
        wrapper,
      });
      await result.current.mutateAsync({
        id: "app-1",
        data: { candidateName: "Updated Name" } as never,
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });

      vi.mocked(applicationsApi.updateCandidate).mockRejectedValueOnce(
        new Error("Candidate update failed"),
      );
      await expect(
        result.current.mutateAsync({
          id: "app-1",
          data: { candidateName: "Updated Name" } as never,
        }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useUploadDocumentMutation invalidates applications and candidates on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(applicationsApi.uploadDocument).mockResolvedValueOnce({
        id: "doc-1",
      } as never);

      const { result } = renderHook(() => useUploadDocumentMutation(), {
        wrapper,
      });
      const mockFile = new File(["dummy"], "cv.pdf", {
        type: "application/pdf",
      });
      await result.current.mutateAsync({ id: "app-1", file: mockFile });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });

      vi.mocked(applicationsApi.uploadDocument).mockRejectedValueOnce(
        new Error("Upload failed"),
      );
      await expect(
        result.current.mutateAsync({ id: "app-1", file: mockFile }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });
      expect(spy).toHaveBeenCalledTimes(4);
    });

    it("useDeleteApplicationMutation invalidates applications and candidates on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(applicationsApi.delete).mockResolvedValueOnce({
        success: true,
      } as never);

      const { result } = renderHook(() => useDeleteApplicationMutation(), {
        wrapper,
      });
      await result.current.mutateAsync("app-1");
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });

      vi.mocked(applicationsApi.delete).mockRejectedValueOnce(
        new Error("Delete failed"),
      );
      await expect(result.current.mutateAsync("app-1")).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });
      expect(spy).toHaveBeenCalledTimes(4);
    });

    it("useDeleteDocumentMutation invalidates applications and candidates on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(applicationsApi.deleteDocument).mockResolvedValueOnce({
        success: true,
      } as never);

      const { result } = renderHook(() => useDeleteDocumentMutation(), {
        wrapper,
      });
      await result.current.mutateAsync({ id: "app-1", documentId: "doc-1" });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });

      vi.mocked(applicationsApi.deleteDocument).mockRejectedValueOnce(
        new Error("Doc delete failed"),
      );
      await expect(
        result.current.mutateAsync({ id: "app-1", documentId: "doc-1" }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });
      expect(spy).toHaveBeenCalledTimes(4);
    });
  });

  describe("Domain 7: Candidate Hooks (5 hooks)", () => {
    it("useCreateCandidateMutation invalidates candidates on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(candidatesApi.create).mockResolvedValueOnce({
        id: "cand-1",
      } as never);

      const { result } = renderHook(() => useCreateCandidateMutation(), {
        wrapper,
      });
      await result.current.mutateAsync(new FormData());
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });

      vi.mocked(candidatesApi.create).mockRejectedValueOnce(
        new Error("Candidate create failed"),
      );
      await expect(
        result.current.mutateAsync(new FormData()),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("useUpdateCandidateDetailsMutation invalidates candidates, candidate detail, and applications on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(candidatesApi.update).mockResolvedValueOnce({
        id: "cand-1",
      } as never);

      const { result } = renderHook(() => useUpdateCandidateDetailsMutation(), {
        wrapper,
      });
      await result.current.mutateAsync({
        id: "cand-1",
        data: { name: "New Name" } as never,
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });
      expect(spy).toHaveBeenCalledWith({
        queryKey: queryKeys.candidate("cand-1"),
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });

      vi.mocked(candidatesApi.update).mockRejectedValueOnce(
        new Error("Update failed"),
      );
      await expect(
        result.current.mutateAsync({
          id: "cand-1",
          data: { name: "New Name" } as never,
        }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });
      expect(spy).toHaveBeenCalledWith({
        queryKey: queryKeys.candidate("cand-1"),
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledTimes(6);
    });

    it("useDeleteCandidateMutation invalidates candidates, applications, and interviews on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(candidatesApi.delete).mockResolvedValueOnce({
        success: true,
      } as never);

      const { result } = renderHook(() => useDeleteCandidateMutation(), {
        wrapper,
      });
      await result.current.mutateAsync("cand-1");
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["interviews"] });

      vi.mocked(candidatesApi.delete).mockRejectedValueOnce(
        new Error("Delete candidate failed"),
      );
      await expect(result.current.mutateAsync("cand-1")).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["interviews"] });
      expect(spy).toHaveBeenCalledTimes(6);
    });

    it("useUploadCandidateDocumentMutation invalidates candidate detail and candidates on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(candidatesApi.uploadDocument).mockResolvedValueOnce({
        id: "doc-1",
      } as never);

      const { result } = renderHook(
        () => useUploadCandidateDocumentMutation(),
        { wrapper },
      );
      const mockFile = new File(["dummy"], "resume.pdf", {
        type: "application/pdf",
      });
      await result.current.mutateAsync({ id: "cand-1", file: mockFile });
      expect(spy).toHaveBeenCalledWith({
        queryKey: queryKeys.candidate("cand-1"),
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });

      vi.mocked(candidatesApi.uploadDocument).mockRejectedValueOnce(
        new Error("Upload doc failed"),
      );
      await expect(
        result.current.mutateAsync({ id: "cand-1", file: mockFile }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({
        queryKey: queryKeys.candidate("cand-1"),
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });
      expect(spy).toHaveBeenCalledTimes(4);
    });

    it("useDeleteCandidateDocumentMutation invalidates candidate detail and candidates on success and error", async () => {
      const { queryClient, wrapper } = createWrapper();
      const spy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(candidatesApi.deleteDocument).mockResolvedValueOnce({
        success: true,
      } as never);

      const { result } = renderHook(
        () => useDeleteCandidateDocumentMutation(),
        { wrapper },
      );
      await result.current.mutateAsync({ id: "cand-1", documentId: "doc-1" });
      expect(spy).toHaveBeenCalledWith({
        queryKey: queryKeys.candidate("cand-1"),
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });

      vi.mocked(candidatesApi.deleteDocument).mockRejectedValueOnce(
        new Error("Delete doc failed"),
      );
      await expect(
        result.current.mutateAsync({ id: "cand-1", documentId: "doc-1" }),
      ).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith({
        queryKey: queryKeys.candidate("cand-1"),
      });
      expect(spy).toHaveBeenCalledWith({ queryKey: ["candidates"] });
      expect(spy).toHaveBeenCalledTimes(4);
    });
  });
});
