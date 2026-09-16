"use client";

import React, { useState, useRef, useId } from "react";
import { useParams, useRouter } from "next/navigation";
import { useJob, useCreateApplicationMutation } from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useI18n } from "@/i18n";
import { buildCandidateNotes } from "@/lib/utils";
import {
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Globe2,
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Share2,
  Check,
  Sparkles,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export default function CareerJobPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const rawJobId = params?.jobId;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);

  const { data: job, isLoading, isError } = useJob(jobId);
  const applyMutation = useCreateApplicationMutation();

  // Form states
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [notes, setNotes] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputId = useId();

  // Handle file drop & select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file?: File) => {
    setFileError(null);
    if (!file) return;

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setFileError(t("applications.fileTooLarge") || "File size exceeds 10MB limit.");
      return;
    }

    setResumeFile(file);
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!lastName.trim()) {
      setSubmitError("Vui lòng nhập họ và tên đệm.");
      return;
    }
    if (!firstName.trim()) {
      setSubmitError("Vui lòng nhập tên.");
      return;
    }
    if (!candidateEmail.trim() || !candidateEmail.includes("@")) {
      setSubmitError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }
    if (!resumeFile) {
      setSubmitError("Vui lòng đính kèm file CV của bạn (PDF/DOCX).");
      return;
    }

    try {
      const fullName = `${lastName.trim()} ${firstName.trim()}`.trim();
      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("candidateName", fullName);
      formData.append("candidateEmail", candidateEmail.trim());
      const formattedNotes = buildCandidateNotes({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        customNotes: notes.trim() || undefined,
      });

      if (candidatePhone.trim()) {
        formData.append("candidatePhone", candidatePhone.trim());
      }
      if (formattedNotes) {
        formData.append("notes", formattedNotes);
      }
      formData.append("resume", resumeFile);

      await applyMutation.mutateAsync(formData);
      setIsSuccess(true);
    } catch (err: unknown) {
      console.error("Apply error:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Đã có lỗi xảy ra khi nộp hồ sơ. Vui lòng thử lại.";
      setSubmitError(errorMsg);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <LoadingSpinner />
        <p className="mt-4 text-xs font-semibold text-slate-500">Đang tải thông tin vị trí tuyển dụng...</p>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Không tìm thấy vị trí tuyển dụng</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-md">
          Vị trí này có thể không tồn tại hoặc đường dẫn không còn chính xác.
        </p>
        <Button
          onClick={() => router.push("/")}
          className="mt-6 h-9 rounded-xl text-xs font-semibold cursor-pointer"
          variant="outline"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Về trang chủ
        </Button>
      </div>
    );
  }

  // Nếu trạng thái của job không phải là đang mở (PUBLISHED) thì không được hiển thị nội dung tuyển dụng
  if (job.status !== "PUBLISHED") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Vị trí tuyển dụng chưa mở hoặc đã đóng</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-md leading-relaxed">
          Vị trí này hiện đang ở trạng thái bản nháp hoặc đã ngừng nhận hồ sơ ứng tuyển. Vui lòng quay lại sau hoặc liên hệ với bộ phận tuyển dụng của công ty.
        </p>
        <Button
          onClick={() => router.push("/")}
          className="mt-6 h-9 rounded-xl text-xs font-semibold cursor-pointer"
          variant="outline"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Về trang chủ
        </Button>
      </div>
    );
  }

  const orgName = job.organization?.name || "Công ty tuyển dụng";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-xs">
              {orgName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Careers at</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{orgName}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleCopyLink}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Sao chép liên kết tuyển dụng"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Chia sẻ</span>
                </>
              )}
            </button>

            <LanguageDropdown />

            <Button
              onClick={scrollToForm}
              className="hidden sm:inline-flex h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Ứng tuyển ngay
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Job Overview & Description (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            {/* Title & Metadata */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{job.department || "Tuyển dụng"}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                {job.title}
              </h1>

              {/* Badges Grid */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <MapPin className="h-3.5 w-3.5 text-blue-500" />
                  <span>{job.location || "Toàn quốc"}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{job.type.replace("_", " ")}</span>
                </div>

                {job.workplace && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <Globe2 className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{job.workplace}</span>
                  </div>
                )}

                {job.salaryRange && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{job.salaryRange}</span>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-slate-200/80 dark:border-slate-800" />

            {/* Description Section */}
            <div className="space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Mô tả công việc (Job Description)
              </h2>
              <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line space-y-3 font-normal">
                {job.description}
              </div>
            </div>

            {/* Requirements Section */}
            {job.requirements && (
              <div className="space-y-4 pt-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                  Yêu cầu ứng viên (Requirements)
                </h2>
                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line space-y-3 font-normal">
                  {job.requirements}
                </div>
              </div>
            )}

            {/* Company Assurance */}
            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-3.5">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-bold text-slate-800 dark:text-white">Quy trình tuyển dụng minh bạch</p>
                <p className="leading-relaxed">
                  Hồ sơ của bạn được lưu trữ an toàn và bảo mật. Sau khi tiếp nhận, đội ngũ nhân sự sẽ phản hồi trạng thái hồ sơ trực tiếp qua email của bạn.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Application Form or Success Banner (5 cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24" ref={formRef}>
            {isSuccess ? (
              <div className="p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-slate-900 shadow-md text-center space-y-4 animate-in fade-in duration-300">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Ứng tuyển thành công!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Cảm ơn <span className="font-bold text-slate-700 dark:text-slate-200">{`${lastName} ${firstName}`.trim()}</span>! Hồ sơ của bạn cho vị trí{" "}
                    <span className="font-bold text-slate-700 dark:text-slate-200">{job.title}</span> đã được chuyển trực tiếp đến bộ phận tuyển dụng tại{" "}
                    <span className="font-bold text-slate-700 dark:text-slate-200">{orgName}</span>.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-left text-xs text-slate-600 dark:text-slate-300 space-y-1.5 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email liên hệ:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{candidateEmail}</span>
                  </div>
                  {resumeFile && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tệp hồ sơ:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                        {resumeFile.name}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => {
                    setIsSuccess(false);
                    setResumeFile(null);
                    setLastName("");
                    setFirstName("");
                    setCandidateEmail("");
                    setCandidatePhone("");
                    setNotes("");
                  }}
                  variant="outline"
                  className="w-full h-9 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Nộp một hồ sơ khác
                </Button>
              </div>
            ) : (
              <div className="p-6 sm:p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md space-y-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Nộp đơn ứng tuyển
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Điền thông tin và đính kèm CV của bạn để ứng tuyển vào vị trí này.
                  </p>
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Candidate Name: Họ và tên đệm / Tên */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Họ và tên đệm <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="Ví dụ: Nguyễn Văn"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="h-9 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Tên <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="Ví dụ: An"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="h-9 rounded-xl text-xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Candidate Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Địa chỉ Email <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="nguyenvana@example.com"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      className="h-9 rounded-xl text-xs"
                      required
                    />
                  </div>

                  {/* Candidate Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Số điện thoại <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                    </label>
                    <Input
                      type="tel"
                      placeholder="0912 345 678"
                      value={candidatePhone}
                      onChange={(e) => setCandidatePhone(e.target.value)}
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>

                  {/* Resume Upload Dropzone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Tệp đính kèm CV (Resume) <span className="text-rose-500">*</span>
                    </label>

                    <input
                      id={fileInputId}
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {resumeFile ? (
                      <div className="p-3 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/30 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {resumeFile.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setResumeFile(null)}
                          className="h-6 w-6 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor={fileInputId}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className="p-5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
                      >
                        <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/60 text-slate-400 group-hover:text-blue-600 flex items-center justify-center mb-2 transition-colors">
                          <UploadCloud className="h-5 w-5" />
                        </div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Nhấp để tải lên hoặc kéo thả CV vào đây
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Hỗ trợ file PDF, DOC, DOCX (Tối đa 10MB)
                        </div>
                      </label>
                    )}

                    {fileError && (
                      <p className="text-[11px] text-rose-500 font-medium">{fileError}</p>
                    )}
                  </div>

                  {/* Notes / Message - Tạm thời ẩn */}
                  {/* <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Lời nhắn gửi nhà tuyển dụng <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                    </label>
                    <Textarea
                      rows={3}
                      placeholder="Giới thiệu ngắn gọn về bản thân hoặc kinh nghiệm nổi bật của bạn..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="rounded-xl text-xs resize-none"
                    />
                  </div> */}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={applyMutation.isPending}
                    className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer transition-all active:scale-[0.99] disabled:opacity-60"
                  >
                    {applyMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>Đang nộp hồ sơ...</span>
                      </div>
                    ) : (
                      "Nộp hồ sơ ứng tuyển ngay"
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs py-6 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            Powered by <span className="font-bold text-slate-700 dark:text-slate-200">ATS Platform</span>
          </div>
          <div>
            © {new Date().getFullYear()} {orgName}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
