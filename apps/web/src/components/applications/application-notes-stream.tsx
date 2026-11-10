"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Pencil,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import {
  useApplicationNotes,
  useAddApplicationNoteMutation,
  useUpdateApplicationNoteMutation,
  useDeleteApplicationNoteMutation,
} from "@/hooks/use-queries";
import { getInitials, formatRelativeTime, formatDate } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/i18n";
import type { ApplicationNote } from "@/types";

interface ApplicationNotesStreamProps {
  applicationId: string;
  compact?: boolean;
  showHeader?: boolean;
  maxHeight?: string;
  placeholder?: string;
}

function getRoleBadge(role: string) {
  const normalized = role.toUpperCase();
  switch (normalized) {
    case "ADMIN":
      return {
        label: "Admin",
        className:
          "bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50",
      };
    case "RECRUITER":
      return {
        label: "Recruiter",
        className:
          "bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50",
      };
    case "HIRING_MANAGER":
      return {
        label: "Hiring Manager",
        className:
          "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
      };
    case "INTERVIEWER":
      return {
        label: "Interviewer",
        className:
          "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
      };
    default:
      return {
        label: role,
        className:
          "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      };
  }
}

function getAvatarBg(name: string) {
  const colors = [
    "bg-blue-600 text-white",
    "bg-indigo-600 text-white",
    "bg-emerald-600 text-white",
    "bg-amber-600 text-white",
    "bg-rose-600 text-white",
    "bg-teal-600 text-white",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function ApplicationNotesStream({
  applicationId,
  compact = false,
  showHeader = true,
  maxHeight,
  placeholder,
}: ApplicationNotesStreamProps) {
  const { t } = useI18n();
  const { user } = useAuth();

  const { data: notes = [], isLoading } = useApplicationNotes(applicationId);
  const addNoteMutation = useAddApplicationNoteMutation();
  const updateNoteMutation = useUpdateApplicationNoteMutation();
  const deleteNoteMutation = useDeleteApplicationNoteMutation();

  const [composerContent, setComposerContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingNoteId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.setSelectionRange(
        editTextareaRef.current.value.length,
        editTextareaRef.current.value.length,
      );
    }
  }, [editingNoteId]);

  const handleAddNote = async () => {
    const trimmed = composerContent.trim();
    if (!trimmed || addNoteMutation.isPending) return;

    try {
      await addNoteMutation.mutateAsync({
        applicationId,
        content: trimmed,
      });
      setComposerContent("");
      setIsFocused(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  const handleStartEdit = (note: ApplicationNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setDeletingNoteId(null);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (noteId: string) => {
    const trimmed = editContent.trim();
    if (!trimmed || updateNoteMutation.isPending) return;

    try {
      await updateNoteMutation.mutateAsync({
        applicationId,
        noteId,
        content: trimmed,
      });
      setEditingNoteId(null);
      setEditContent("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (deleteNoteMutation.isPending) return;

    try {
      await deleteNoteMutation.mutateAsync({
        applicationId,
        noteId,
      });
      setDeletingNoteId(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  const canManageNote = (note: ApplicationNote) => {
    if (!user) return false;
    if (user.role === "ADMIN") return true;
    return note.authorId === user.id;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t("applications.notesStream.title")}
            </h3>
            {notes.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {notes.length}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            {t("applications.notesStream.subtitle")}
          </p>
        </div>
      )}

      {/* Trello-Style Composer */}
      <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 shadow-2xs transition-all duration-200 focus-within:border-blue-500/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900/60 dark:focus-within:border-blue-400 dark:focus-within:bg-slate-900">
        <div className="flex gap-2.5">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-2xs ${getAvatarBg(
              user?.name || "User",
            )}`}
          >
            {getInitials(user?.name || "U")}
          </div>

          <div className="flex-1 space-y-2">
            <textarea
              ref={composerTextareaRef}
              rows={isFocused || composerContent ? 3 : compact ? 1 : 2}
              value={composerContent}
              onChange={(e) => setComposerContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
              placeholder={placeholder || t("applications.notePlaceholder")}
              className="w-full resize-none bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden dark:text-slate-100 dark:placeholder-slate-500"
            />

            {(isFocused || composerContent.trim().length > 0) && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-400">
                  {t("applications.notesStream.keyboardHint")}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setComposerContent("");
                      setIsFocused(false);
                    }}
                    className="h-7 px-2.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    {t("applications.notesStream.cancel")}
                  </button>

                  <button
                    type="button"
                    disabled={
                      !composerContent.trim() || addNoteMutation.isPending
                    }
                    onClick={handleAddNote}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {addNoteMutation.isPending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>{t("applications.notesStream.saving")}</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" />
                        <span>{t("applications.notesStream.addNote")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes Stream / Feed */}
      <div
        className={`space-y-2.5 ${
          maxHeight ? `overflow-y-auto pr-1 ${maxHeight}` : ""
        }`}
      >
        {isLoading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && notes.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-6 px-4 text-center dark:border-slate-800">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <MessageSquare className="h-4 w-4" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {compact
                ? t("applications.notesStream.emptyCompact")
                : t("applications.notesStream.empty")}
            </p>
          </div>
        )}

        {!isLoading &&
          notes.map((note) => {
            const isEditing = editingNoteId === note.id;
            const isDeleting = deletingNoteId === note.id;
            const roleBadge = getRoleBadge(note.authorRole);
            const userCanManage = canManageNote(note);

            return (
              <div
                key={note.id}
                className="group relative rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition-all hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/70 dark:hover:border-slate-700"
              >
                <div className="flex items-start gap-2.5">
                  {/* Author Avatar */}
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-2xs mt-0.5 ${getAvatarBg(
                      note.authorName,
                    )}`}
                  >
                    {getInitials(note.authorName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {note.authorName}
                        </span>

                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded-sm border text-[10px] font-medium ${roleBadge.className}`}
                        >
                          {roleBadge.label}
                        </span>

                        <span
                          className="text-[10px] text-slate-400 cursor-default"
                          title={formatDate(note.createdAt, "standard")}
                        >
                          • {formatRelativeTime(note.createdAt)}
                        </span>

                        {note.isEdited && (
                          <span className="text-[10px] text-slate-400 italic">
                            {t("applications.notesStream.edited")}
                          </span>
                        )}
                      </div>

                      {/* Note Actions */}
                      {userCanManage && !isEditing && (
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(note)}
                            title={t("applications.notesStream.editNote")}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingNoteId(note.id)}
                            title={t("applications.notesStream.deleteNote")}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline Delete Confirmation */}
                    {isDeleting && (
                      <div className="my-2 p-2.5 rounded-lg bg-rose-50/80 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40 text-xs space-y-2">
                        <p className="text-rose-700 dark:text-rose-300 font-medium">
                          {t("applications.notesStream.deleteConfirm")}
                        </p>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDeletingNoteId(null)}
                            className="h-6 px-2 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-medium dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
                          >
                            {t("applications.notesStream.cancel")}
                          </button>
                          <button
                            type="button"
                            disabled={deleteNoteMutation.isPending}
                            onClick={() => handleDeleteNote(note.id)}
                            className="h-6 px-2 rounded-md bg-rose-600 text-white hover:bg-rose-700 text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {deleteNoteMutation.isPending ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-2.5 w-2.5" />
                            )}
                            <span>
                              {t("applications.notesStream.deleteNote")}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inline Edit Form */}
                    {isEditing ? (
                      <div className="space-y-2 mt-1.5">
                        <textarea
                          ref={editTextareaRef}
                          rows={3}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                              e.preventDefault();
                              handleSaveEdit(note.id);
                            } else if (e.key === "Escape") {
                              handleCancelEdit();
                            }
                          }}
                          className="w-full text-xs p-2.5 rounded-lg border border-blue-400 bg-white dark:bg-slate-950 dark:border-blue-500 focus:outline-hidden ring-2 ring-blue-500/10 resize-none text-slate-800 dark:text-slate-100"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            {t("applications.notesStream.keyboardHint")}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="h-6 px-2 rounded-md text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            >
                              {t("applications.notesStream.cancel")}
                            </button>
                            <button
                              type="button"
                              disabled={
                                !editContent.trim() ||
                                updateNoteMutation.isPending
                              }
                              onClick={() => handleSaveEdit(note.id)}
                              className="inline-flex h-6 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                            >
                              {updateNoteMutation.isPending ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <Check className="h-2.5 w-2.5" />
                              )}
                              <span>{t("applications.notesStream.save")}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Display Note Body */
                      !isDeleting && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                          {note.content}
                        </p>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
