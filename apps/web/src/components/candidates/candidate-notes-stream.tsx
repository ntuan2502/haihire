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
  useCandidateNotes,
  useAddCandidateNoteMutation,
  useUpdateCandidateNoteMutation,
  useDeleteCandidateNoteMutation,
} from "@/hooks/use-queries";
import { getInitials, formatRelativeTime, formatDate } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { getOrgRoleBadgeClass, getOrgRoleLabel } from "@/lib/roles";
import { useI18n } from "@/i18n";
import type { CandidateNote } from "@/types";

interface CandidateNotesStreamProps {
  candidateId: string;
  compact?: boolean;
  showHeader?: boolean;
  maxHeight?: string;
  placeholder?: string;
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

export function CandidateNotesStream({
  candidateId,
  compact = false,
  showHeader = true,
  maxHeight,
  placeholder,
}: CandidateNotesStreamProps) {
  const { t } = useI18n();
  const { user } = useAuth();

  const { data: notes = [], isLoading } = useCandidateNotes(candidateId);
  const addNoteMutation = useAddCandidateNoteMutation();
  const updateNoteMutation = useUpdateCandidateNoteMutation();
  const deleteNoteMutation = useDeleteCandidateNoteMutation();

  const [composerContent, setComposerContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize composer textarea
  useEffect(() => {
    if (composerTextareaRef.current) {
      composerTextareaRef.current.style.height = "auto";
      composerTextareaRef.current.style.height = `${Math.min(
        composerTextareaRef.current.scrollHeight,
        240,
      )}px`;
    }
  }, [composerContent]);

  // Auto-resize edit textarea & focus when editing begins
  useEffect(() => {
    if (editingNoteId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.style.height = "auto";
      editTextareaRef.current.style.height = `${Math.min(
        editTextareaRef.current.scrollHeight,
        240,
      )}px`;
    }
  }, [editingNoteId]);

  const handleCreateNote = async () => {
    const trimmed = composerContent.trim();
    if (!trimmed || addNoteMutation.isPending) return;

    try {
      await addNoteMutation.mutateAsync({
        candidateId,
        content: trimmed,
      });
      setComposerContent("");
      setIsFocused(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  const handleStartEdit = (note: CandidateNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setDeleteConfirmId(null);
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
        candidateId,
        noteId,
        content: trimmed,
      });
      setEditingNoteId(null);
      setEditContent("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNoteMutation.mutateAsync({
        candidateId,
        noteId,
      });
      setDeleteConfirmId(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t));
    }
  };

  const handleKeyDownComposer = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleCreateNote();
    }
  };

  const handleKeyDownEdit = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    noteId: string,
  ) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit(noteId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const canManageNote = (note: CandidateNote) => {
    if (!user) return false;
    if (note.authorId === user.id) return true;
    if (user.role === "ADMIN" || user.isOwner) return true;
    return false;
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t("candidates.notesTitle")}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t("applications.notesStream.subtitle")}
              </p>
            </div>
          </div>
          {notes.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {notes.length}
            </span>
          )}
        </div>
      )}

      {/* Composer (Trello / Stream style rich input) */}
      <div
        className={`rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 ${
          isFocused || composerContent
            ? "border-blue-500 shadow-sm ring-2 ring-blue-500/10 dark:ring-blue-500/20"
            : "border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700"
        }`}
      >
        <div className="p-3">
          <textarea
            ref={composerTextareaRef}
            rows={isFocused || composerContent ? 3 : 2}
            value={composerContent}
            onChange={(e) => setComposerContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDownComposer}
            placeholder={
              placeholder || t("applications.notesStream.placeholder")
            }
            className="w-full text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent resize-none border-0 focus:outline-none focus:ring-0 leading-relaxed"
          />

          {(isFocused || composerContent) && (
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                {t("applications.notesStream.keyboardHint")}
              </span>
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setComposerContent("");
                    setIsFocused(false);
                  }}
                  disabled={addNoteMutation.isPending}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  {t("applications.notesStream.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleCreateNote}
                  disabled={
                    !composerContent.trim() || addNoteMutation.isPending
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

      {/* Stream List */}
      <div
        className={`space-y-3 ${
          maxHeight ? `overflow-y-auto pr-1 ${maxHeight}` : ""
        }`}
      >
        {isLoading ? (
          <div className="py-8 flex justify-center items-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/30">
            <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {compact
                ? t("applications.notesStream.emptyCompact")
                : t("applications.notesStream.empty")}
            </p>
          </div>
        ) : (
          notes.map((note) => {
            const isEditing = editingNoteId === note.id;
            const isConfirmingDelete = deleteConfirmId === note.id;
            const canManage = canManageNote(note);
            const roleLabel = getOrgRoleLabel(note.authorRole, t);
            const roleBadgeClass = getOrgRoleBadgeClass(note.authorRole);
            const avatarBg = getAvatarBg(note.authorName);
            const initials = getInitials(note.authorName);

            return (
              <div
                key={note.id}
                className="group relative rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs hover:shadow-xs transition-all duration-150"
              >
                {/* Note Header */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`h-7 w-7 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs ${avatarBg}`}
                      title={note.authorName}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {note.authorName}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${roleBadgeClass}`}
                      >
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400">
                    {note.isEdited && (
                      <span
                        className="italic text-slate-400 dark:text-slate-500"
                        title={formatDate(note.updatedAt)}
                      >
                        {t("applications.notesStream.edited")}
                      </span>
                    )}
                    <span title={formatDate(note.createdAt)}>
                      {formatRelativeTime(note.createdAt)}
                    </span>

                    {/* Quick action buttons on hover */}
                    {canManage && !isEditing && !isConfirmingDelete && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(note)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                          title={t("applications.notesStream.editNote")}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirmId(note.id);
                            setEditingNoteId(null);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title={t("applications.notesStream.deleteNote")}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Delete Confirmation */}
                {isConfirmingDelete && (
                  <div className="my-2.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-rose-800 dark:text-rose-200">
                      {t("applications.notesStream.deleteConfirm")}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        disabled={deleteNoteMutation.isPending}
                        className="px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition-colors"
                      >
                        {t("applications.notesStream.cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        disabled={deleteNoteMutation.isPending}
                        className="px-2.5 py-0.5 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                      >
                        {deleteNoteMutation.isPending && (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        )}
                        <span>{t("applications.notesStream.deleteNote")}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Content / Inline Edit */}
                {isEditing ? (
                  <div className="pt-2.5 space-y-2">
                    <textarea
                      ref={editTextareaRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => handleKeyDownEdit(e, note.id)}
                      className="w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {t("applications.notesStream.keyboardHint")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={updateNoteMutation.isPending}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 transition-colors"
                        >
                          {t("applications.notesStream.cancel")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={
                            !editContent.trim() || updateNoteMutation.isPending
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs disabled:opacity-50 transition-all"
                        >
                          {updateNoteMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          <span>{t("applications.notesStream.save")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                    {note.content}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
