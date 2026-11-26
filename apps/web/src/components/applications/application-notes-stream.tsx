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
import { toast } from "@/lib/toast";
import { useAuth } from "@/context/auth-context";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useApplicationNotes,
  useAddApplicationNoteMutation,
  useUpdateApplicationNoteMutation,
  useDeleteApplicationNoteMutation,
} from "@/hooks/use-queries";
import { getInitials, formatRelativeTime, formatDate } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { getOrgRoleBadgeClass, getOrgRoleLabel } from "@/lib/roles";
import { useI18n } from "@/i18n";
import { useLocalization } from "@/components/providers";
import { ApplicationSectionCard } from "@/components/applications/detail/application-section-card";
import type { ApplicationNote } from "@/types";

interface ApplicationNotesStreamProps {
  applicationId: string;
  compact?: boolean;
  showHeader?: boolean;
  maxHeight?: string;
  placeholder?: string;
}

function getAvatarBg(name: string) {
  const colors = [
    "bg-sky-600 text-white",
    "bg-violet-600 text-white",
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
  const { t, locale } = useI18n();
  const { localization } = useLocalization();
  const { user } = useAuth();
  const canCreateNote = useHasPermission("application:update");

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

  const notesBody = (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {t("applications.notesStream.subtitle")}
      </p>

      {/* Trello-Style Composer */}
      {canCreateNote && (
        <div className="rounded-xl border border-border bg-background/40 p-3 shadow-2xs transition-colors duration-200 focus-within:border-ring focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/20">
          <div className="flex gap-2.5">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-2xs ${getAvatarBg(
                user?.name || t("common.unknownUserFallback"),
              )}`}
            >
              {getInitials(user?.name || t("common.unknownUserFallback"))}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
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
                className="w-full resize-none bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden"
              />

              {(isFocused || composerContent.trim().length > 0) && (
                <div className="flex flex-wrap items-center justify-end sm:justify-between gap-2 pt-1 border-t border-border">
                  <span className="hidden sm:inline text-[10px] text-muted-foreground">
                    {t("applications.notesStream.keyboardHint")}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setComposerContent("");
                        setIsFocused(false);
                      }}
                      className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {t("common.cancel")}
                    </button>

                    <button
                      type="button"
                      disabled={
                        !composerContent.trim() || addNoteMutation.isPending
                      }
                      onClick={handleAddNote}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {addNoteMutation.isPending ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>{t("common.saving")}</span>
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
      )}

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
                className="animate-pulse rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-full bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
                <div className="h-3 w-3/4 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && notes.length === 0 && (
          <div className="rounded-xl border border-border bg-background/40 px-4 py-3.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {compact
              ? t("applications.notesStream.emptyCompact")
              : t("applications.notesStream.empty")}
          </div>
        )}

        {!isLoading &&
          notes.map((note) => {
            const isEditing = editingNoteId === note.id;
            const isDeleting = deletingNoteId === note.id;
            const roleLabel = getOrgRoleLabel(note.authorRole, t);
            const roleBadgeClass = getOrgRoleBadgeClass(note.authorRole);
            const userCanManage = canManageNote(note);

            return (
              <div
                key={note.id}
                className="group relative rounded-xl border border-border bg-background/40 text-card-foreground p-3.5 transition-colors hover:border-ring/50"
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
                        <span className="text-xs font-semibold text-foreground">
                          {note.authorName}
                        </span>

                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded-sm border text-[10px] font-medium ${roleBadgeClass}`}
                        >
                          {roleLabel}
                        </span>

                        <span
                          className="text-[10px] text-muted-foreground cursor-default"
                          title={formatDate(note.createdAt, "standard", {
                            ...localization,
                            defaultLanguage: locale,
                          })}
                        >
                          •{" "}
                          {formatRelativeTime(note.createdAt, {
                            ...localization,
                            defaultLanguage: locale,
                          })}
                        </span>

                        {note.isEdited && (
                          <span className="text-[10px] text-muted-foreground">
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
                            title={t("common.edit")}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingNoteId(note.id)}
                            title={t("common.delete")}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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
                            className="h-6 px-2 rounded-md bg-background border border-input text-foreground hover:bg-accent text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            {t("common.cancel")}
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
                            <span>{t("common.delete")}</span>
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
                          className="w-full text-xs p-2.5 rounded-md border border-ring bg-background focus:outline-hidden ring-2 ring-ring/20 resize-none text-foreground"
                        />
                        <div className="flex flex-wrap items-center justify-end sm:justify-between gap-2">
                          <span className="hidden sm:inline text-[10px] text-muted-foreground">
                            {t("applications.notesStream.keyboardHint")}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="h-6 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              {t("common.cancel")}
                            </button>
                            <button
                              type="button"
                              disabled={
                                !editContent.trim() ||
                                updateNoteMutation.isPending
                              }
                              onClick={() => handleSaveEdit(note.id)}
                              className="inline-flex h-6 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground shadow-2xs transition-colors hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
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
                        <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
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

  if (!showHeader) {
    return notesBody;
  }

  return (
    <ApplicationSectionCard
      icon={MessageSquare}
      title={t("applications.notesStream.title")}
      statusMeta={
        <span className="text-xs text-muted-foreground">
          {notes.length > 0
            ? t("applications.notesStream.notesCount", { count: notes.length })
            : t("applications.notesStream.emptyCompact")}
        </span>
      }
      collapsible
      testId="application-notes-section"
    >
      {notesBody}
    </ApplicationSectionCard>
  );
}
