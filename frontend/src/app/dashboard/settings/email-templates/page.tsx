"use client";

import { useState, useEffect, useMemo, useRef, type ElementType } from "react";
import {
  Mail,
  Sliders,
  History,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  Eye,
  Smartphone,
  Monitor,
  RotateCcw,
  Save,
  Search,
  X,
  FileText,
  Calendar,
  UserCheck,
  Award,
} from "lucide-react";
import {
  type EmailTemplateType,
  type EmailTemplate,
  type EmailSettings,
  type EmailLog,
  type EmailProviderType,
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_EMAIL_SETTINGS,
  TEMPLATE_VARIABLES,
  MOCK_EMAIL_LOGS,
  interpolateTemplate,
} from "@/lib/email-templates";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/shared/custom-select";

import {
  useEmailTemplates,
  useUpdateEmailTemplateMutation,
  useEmailSettings,
  useUpdateEmailSettingsMutation,
  useSendTestEmailMutation,
  useEmailLogs,
} from "@/hooks/use-queries";

export default function EmailTemplatesSettingsPage() {
  const { t } = useI18n();

  // Navigation tab: 'templates' | 'settings' | 'logs'
  const [activeTab, setActiveTab] = useState<"templates" | "settings" | "logs">("templates");

  // Backend queries & mutations
  const { data: remoteTemplates } = useEmailTemplates();
  const updateTemplateMutation = useUpdateEmailTemplateMutation();

  const { data: remoteSettings } = useEmailSettings();
  const updateSettingsMutation = useUpdateEmailSettingsMutation();
  const sendTestMutation = useSendTestEmailMutation();

  const { data: remoteLogs } = useEmailLogs();

  // Templates state
  const [templates, setTemplates] = useState<Record<EmailTemplateType, EmailTemplate>>(
    DEFAULT_EMAIL_TEMPLATES,
  );
  const [selectedType, setSelectedType] =
    useState<EmailTemplateType>("APPLICATION_CONFIRMATION");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [templateToast, setTemplateToast] = useState<string | null>(null);

  // Email provider / SMTP settings state
  const [emailSettings, setEmailSettings] =
    useState<EmailSettings>(DEFAULT_EMAIL_SETTINGS);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState<string | null>(null);

  // Sync remote templates when fetched
  useEffect(() => {
    if (remoteTemplates && remoteTemplates.length > 0) {
      setTemplates((prev) => {
        const next = { ...prev };
        for (const t of remoteTemplates) {
          if (next[t.type]) {
            next[t.type] = {
              ...next[t.type],
              subject: t.subject,
              body: t.body,
              enabled: t.enabled,
            };
          }
        }
        return next;
      });
    }
  }, [remoteTemplates]);

  // Sync remote settings when fetched
  useEffect(() => {
    if (remoteSettings) {
      setEmailSettings(remoteSettings);
    }
  }, [remoteSettings]);

  // Outbox / logs state
  const logs = (remoteLogs && remoteLogs.length > 0 ? remoteLogs : MOCK_EMAIL_LOGS) as EmailLog[];
  const [logSearch, setLogSearch] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState<string>("ALL");
  const [viewingLog, setViewingLog] = useState<EmailLog | null>(null);

  const activeTemplate = templates[selectedType];
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sample variable values for live preview
  const sampleVariables = useMemo(() => {
    return {
      candidate_name: "Nguyễn Văn An",
      candidate_email: "an.nguyen@example.com",
      job_title: "Senior Frontend Engineer",
      company_name: "Nexus Corporation",
      interview_date: "22/09/2026",
      interview_time: "14:30",
      interview_format: "Google Meet",
      meeting_link: "https://meet.google.com/xyz-abcd-efg",
      interviewer_name: "Trần Minh (Tech Lead)",
      sender_name: emailSettings.fromName || "Đội ngũ Tuyển dụng",
    };
  }, [emailSettings.fromName]);

  const previewSubject = useMemo(() => {
    return interpolateTemplate(activeTemplate.subject, sampleVariables);
  }, [activeTemplate.subject, sampleVariables]);

  const previewBody = useMemo(() => {
    return interpolateTemplate(activeTemplate.body, sampleVariables);
  }, [activeTemplate.body, sampleVariables]);

  // Insert variable into active template body
  const handleInsertVariable = (varKey: string) => {
    if (!bodyTextareaRef.current) {
      setTemplates((prev) => ({
        ...prev,
        [selectedType]: {
          ...prev[selectedType],
          body: prev[selectedType].body + " " + varKey,
        },
      }));
      return;
    }

    const textarea = bodyTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentBody = activeTemplate.body;
    const nextBody = currentBody.substring(0, start) + varKey + currentBody.substring(end);

    setTemplates((prev) => ({
      ...prev,
      [selectedType]: {
        ...prev[selectedType],
        body: nextBody,
      },
    }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 0);
  };

  const handleSaveTemplate = async () => {
    try {
      await updateTemplateMutation.mutateAsync({
        type: selectedType,
        data: {
          subject: activeTemplate.subject,
          body: activeTemplate.body,
          enabled: activeTemplate.enabled,
        },
      });
      setTemplateToast(t("email.templateSavedSuccess"));
      setTimeout(() => setTemplateToast(null), 3000);
    } catch {
      setTemplateToast("Lỗi khi lưu mẫu email!");
      setTimeout(() => setTemplateToast(null), 3000);
    }
  };

  const handleResetDefault = () => {
    setTemplates((prev) => ({
      ...prev,
      [selectedType]: { ...DEFAULT_EMAIL_TEMPLATES[selectedType] },
    }));
    setTemplateToast(t("email.templateResetSuccess"));
    setTimeout(() => setTemplateToast(null), 3000);
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettingsMutation.mutateAsync(emailSettings);
      setSettingsSavedMessage("Đã lưu cấu hình gửi thư thành công!");
      setTimeout(() => setSettingsSavedMessage(null), 3000);
    } catch {
      setSettingsSavedMessage("Lỗi khi lưu cấu hình!");
      setTimeout(() => setSettingsSavedMessage(null), 3000);
    }
  };

  const handleSendTest = async () => {
    if (!testEmailAddress.trim()) return;
    try {
      await sendTestMutation.mutateAsync(testEmailAddress.trim());
      setTestSuccessMessage(t("email.testSentSuccess"));
      setTimeout(() => setTestSuccessMessage(null), 4000);
    } catch {
      setTestSuccessMessage("Lỗi khi gửi email thử nghiệm!");
      setTimeout(() => setTestSuccessMessage(null), 4000);
    }
  };

  const isSendingTest = sendTestMutation.isPending;

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchSearch =
        l.candidateName.toLowerCase().includes(logSearch.toLowerCase()) ||
        l.candidateEmail.toLowerCase().includes(logSearch.toLowerCase()) ||
        l.subject.toLowerCase().includes(logSearch.toLowerCase());
      const matchStatus =
        logStatusFilter === "ALL" || l.status === logStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [logs, logSearch, logStatusFilter]);

  const templateIcons: Record<EmailTemplateType, ElementType> = {
    APPLICATION_CONFIRMATION: FileText,
    INTERVIEW_INVITATION: Calendar,
    REJECTION: UserCheck,
    OFFER: Award,
    CUSTOM: Mail,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <span>{t("email.templatesTitle")}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t("email.templatesSubtitle")}
        </p>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "templates"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>{t("email.tabTemplates")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "settings"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>{t("email.tabSettings")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "logs"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
          }`}
        >
          <History className="h-4 w-4" />
          <span>{t("email.tabLogs")}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold">
            {logs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: EMAIL TEMPLATES */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          {/* Template Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(
              [
                "APPLICATION_CONFIRMATION",
                "INTERVIEW_INVITATION",
                "REJECTION",
                "OFFER",
              ] as EmailTemplateType[]
            ).map((typeKey) => {
              const tpl = templates[typeKey];
              const isSelected = selectedType === typeKey;
              const IconComp = templateIcons[typeKey] || Mail;

              return (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setSelectedType(typeKey)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs ring-2 ring-blue-600/20"
                      : "border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`p-2 rounded-xl ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <IconComp className="h-4 w-4" />
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        tpl.enabled
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300"
                          : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700"
                      }`}
                    >
                      {tpl.enabled ? "Đang bật" : "Tắt"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {tpl.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {tpl.subject}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feedback Toast */}
          {templateToast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{templateToast}</span>
            </div>
          )}

          {/* Template Editor & Live Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Editor (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              {/* Auto-send Switch */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {t("email.enableAutoSend")}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("email.enableAutoSendDesc")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={activeTemplate.enabled}
                  onChange={(e) =>
                    setTemplates((prev) => ({
                      ...prev,
                      [selectedType]: {
                        ...prev[selectedType],
                        enabled: e.target.checked,
                      },
                    }))
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t("email.subject")}
                </label>
                <Input
                  value={activeTemplate.subject}
                  onChange={(e) =>
                    setTemplates((prev) => ({
                      ...prev,
                      [selectedType]: {
                        ...prev[selectedType],
                        subject: e.target.value,
                      },
                    }))
                  }
                  className="h-9 text-xs"
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {t("email.body")}
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    HTML / Template Variables
                  </span>
                </div>
                <textarea
                  ref={bodyTextareaRef}
                  value={activeTemplate.body}
                  onChange={(e) =>
                    setTemplates((prev) => ({
                      ...prev,
                      [selectedType]: {
                        ...prev[selectedType],
                        body: e.target.value,
                      },
                    }))
                  }
                  rows={12}
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              {/* Variable Insertion Pills */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                  <span>{t("email.insertVariableHint")}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsertVariable(v.key)}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer shadow-2xs"
                      title={v.label}
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetDefault}
                  className="text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t("email.resetDefault")}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveTemplate}
                  className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{t("email.saveTemplate")}</span>
                </Button>
              </div>
            </div>

            {/* Realistic Live Preview (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <span>{t("email.livePreview")}</span>
                </h3>

                {/* Device Switcher */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      previewDevice === "desktop"
                        ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    }`}
                    title={t("email.previewDeviceDesktop")}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      previewDevice === "mobile"
                        ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    }`}
                    title={t("email.previewDeviceMobile")}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Email Mockup Container */}
              <div
                className={`mx-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-xs transition-all ${
                  previewDevice === "mobile" ? "max-w-[320px]" : "w-full"
                }`}
              >
                {/* Email Client Header Bar */}
                <div className="bg-slate-100 dark:bg-slate-900 px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-rose-400" />
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-slate-400 font-mono ml-2 truncate">
                    Hộp thư đến - Xem trước
                  </span>
                </div>

                {/* Email Meta Details */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                  <div className="truncate">
                    <strong className="text-slate-800 dark:text-slate-200">Từ:</strong>{" "}
                    {emailSettings.fromName} &lt;{emailSettings.fromEmail}&gt;
                  </div>
                  <div className="truncate">
                    <strong className="text-slate-800 dark:text-slate-200">Đến:</strong>{" "}
                    Nguyễn Văn An &lt;an.nguyen@example.com&gt;
                  </div>
                  <div className="pt-1 text-xs font-bold text-slate-900 dark:text-white">
                    {previewSubject}
                  </div>
                </div>

                {/* Rendered HTML Body */}
                <div
                  className="p-4 text-xs text-slate-800 dark:text-slate-200 leading-relaxed space-y-2.5 overflow-x-hidden"
                  dangerouslySetInnerHTML={{ __html: previewBody }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMAIL PROVIDER & SMTP SETTINGS */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {settingsSavedMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{settingsSavedMessage}</span>
            </div>
          )}

          {/* Provider Selection */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("email.providerTitle")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("email.providerDesc")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: "SIMULATED",
                  title: t("email.providerSimulated"),
                  desc: t("email.providerSimulatedDesc"),
                  badge: "Khuyên dùng Dev / Test",
                },
                {
                  id: "SMTP",
                  title: t("email.providerSmtp"),
                  desc: t("email.providerSmtpDesc"),
                  badge: "Doanh nghiệp",
                },
                {
                  id: "RESEND",
                  title: t("email.providerResend"),
                  desc: t("email.providerResendDesc"),
                },
                {
                  id: "SENDGRID",
                  title: t("email.providerSendGrid"),
                  desc: t("email.providerSendGridDesc"),
                },
              ].map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() =>
                    setEmailSettings((prev) => ({
                      ...prev,
                      provider: prov.id as EmailProviderType,
                    }))
                  }
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    emailSettings.provider === prov.id
                      ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-600/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {prov.title}
                    </span>
                    {prov.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        {prov.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {prov.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Provider Credentials Form */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Thông tin Người gửi & Máy chủ
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t("email.senderName")}
                </label>
                <Input
                  value={emailSettings.fromName}
                  onChange={(e) =>
                    setEmailSettings((prev) => ({
                      ...prev,
                      fromName: e.target.value,
                    }))
                  }
                  placeholder="VD: Nexus Recruitment Team"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t("email.senderEmail")}
                </label>
                <Input
                  value={emailSettings.fromEmail}
                  onChange={(e) =>
                    setEmailSettings((prev) => ({
                      ...prev,
                      fromEmail: e.target.value,
                    }))
                  }
                  placeholder="careers@nexus.com"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Specific fields for SMTP */}
            {emailSettings.provider === "SMTP" && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      {t("email.smtpHost")}
                    </label>
                    <Input
                      value={emailSettings.smtpHost}
                      onChange={(e) =>
                        setEmailSettings((prev) => ({
                          ...prev,
                          smtpHost: e.target.value,
                        }))
                      }
                      placeholder="smtp.gmail.com hoặc smtp.office365.com"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      {t("email.smtpPort")}
                    </label>
                    <Input
                      type="number"
                      value={emailSettings.smtpPort}
                      onChange={(e) =>
                        setEmailSettings((prev) => ({
                          ...prev,
                          smtpPort: parseInt(e.target.value, 10) || 587,
                        }))
                      }
                      placeholder="587"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      {t("email.smtpUsername")}
                    </label>
                    <Input
                      value={emailSettings.smtpUser}
                      onChange={(e) =>
                        setEmailSettings((prev) => ({
                          ...prev,
                          smtpUser: e.target.value,
                        }))
                      }
                      placeholder="user@example.com"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      {t("email.smtpPassword")}
                    </label>
                    <Input
                      type="password"
                      value={emailSettings.smtpPass}
                      onChange={(e) =>
                        setEmailSettings((prev) => ({
                          ...prev,
                          smtpPass: e.target.value,
                        }))
                      }
                      placeholder="••••••••••••"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="smtpSecure"
                    checked={emailSettings.smtpSecure}
                    onChange={(e) =>
                      setEmailSettings((prev) => ({
                        ...prev,
                        smtpSecure: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  />
                  <label
                    htmlFor="smtpSecure"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {t("email.smtpSecure")} (TLS/SSL)
                  </label>
                </div>
              </div>
            )}

            {/* Specific fields for Resend or SendGrid */}
            {(emailSettings.provider === "RESEND" ||
              emailSettings.provider === "SENDGRID") && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t("email.apiKey")} ({emailSettings.provider})
                </label>
                <Input
                  type="password"
                  placeholder="re_xxxxxxxxxxxx hoặc SG.xxxxxxxxxxxx"
                  className="h-9 text-xs font-mono"
                />
              </div>
            )}

            <div className="pt-3">
              <Button
                type="button"
                onClick={handleSaveSettings}
                className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Lưu cấu hình dịch vụ
              </Button>
            </div>
          </div>

          {/* Test Email Box */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {t("email.testEmailSection")}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t("email.testEmailDesc")}
              </p>
            </div>

            {testSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{testSuccessMessage}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder={t("email.testEmailPlaceholder")}
                className="h-9 text-xs flex-1"
              />
              <Button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest || !testEmailAddress.trim()}
                className="h-9 px-4 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSendingTest ? t("email.sendingBtn") : t("email.sendTestBtn")}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OUTBOX & AUDIT LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("email.outboxTitle")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("email.outboxDesc")}
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder={t("email.searchRecipient")}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <CustomSelect
                value={logStatusFilter}
                onChange={(val) => setLogStatusFilter(val)}
                options={[
                  { value: "ALL", label: t("email.allStatuses") },
                  { value: "SENT", label: t("email.statusSent") },
                  { value: "SIMULATED", label: t("email.statusSimulated") },
                  { value: "FAILED", label: t("email.statusFailed") },
                ]}
                className="w-36"
                triggerClassName="h-8 text-xs"
              />
            </div>
          </div>

          {/* Outbox Table */}
          <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">{t("email.thSentAt")}</th>
                    <th className="px-4 py-3">{t("email.thRecipient")}</th>
                    <th className="px-4 py-3">{t("email.thTemplate")}</th>
                    <th className="px-4 py-3">{t("email.thSubject")}</th>
                    <th className="px-4 py-3">{t("email.thStatus")}</th>
                    <th className="px-4 py-3 text-right">{t("email.thActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        {t("email.noLogsFound")}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const dateStr = new Date(log.sentAt).toLocaleString("vi-VN", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            {dateStr}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {log.candidateName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {log.candidateEmail}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {log.templateType}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate text-slate-700 dark:text-slate-300 font-medium">
                            {log.subject}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {log.status === "SENT" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>{t("email.statusSent")}</span>
                              </span>
                            )}
                            {log.status === "SIMULATED" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300">
                                <span>{t("email.statusSimulated")}</span>
                              </span>
                            )}
                            {log.status === "FAILED" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300">
                                <AlertCircle className="h-3 w-3" />
                                <span>{t("email.statusFailed")}</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingLog(log)}
                              className="h-7 px-2 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
                            >
                              {t("email.viewDetails")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {viewingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("email.logDetailTitle")}
              </h3>
              <button
                type="button"
                onClick={() => setViewingLog(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400">{t("email.logDetailFrom")}:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewingLog.senderName} &lt;{viewingLog.senderEmail}&gt;
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">{t("email.logDetailTo")}:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewingLog.candidateName} &lt;{viewingLog.candidateEmail}&gt;
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">{t("email.logDetailDate")}:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(viewingLog.sentAt).toLocaleString("vi-VN")}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">{t("email.logDetailStatus")}:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {viewingLog.status}
                  </div>
                </div>
              </div>

              {viewingLog.errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    {t("email.logDetailError")}: {viewingLog.errorMessage}
                  </span>
                </div>
              )}

              <div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  {t("email.subject")}
                </span>
                <div className="mt-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 font-semibold text-slate-900 dark:text-white">
                  {viewingLog.subject}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  {t("email.logDetailBody")}
                </span>
                <div
                  className="mt-1 p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 leading-relaxed text-slate-800 dark:text-slate-200 space-y-2"
                  dangerouslySetInnerHTML={{ __html: viewingLog.body }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingLog(null)}
                className="text-xs font-semibold cursor-pointer"
              >
                {t("email.close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
