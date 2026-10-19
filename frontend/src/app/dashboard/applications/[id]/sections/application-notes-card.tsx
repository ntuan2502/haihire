import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateCandidateMutation } from "@/hooks/use-queries";
import { parseCandidateNotes } from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { Application } from "@/types";

interface ApplicationNotesCardProps {
  app: Application | null | undefined;
}

export function ApplicationNotesCard({ app }: ApplicationNotesCardProps) {
  const { t } = useI18n();
  const updateCandidateMutation = useUpdateCandidateMutation();

  const [noteInput, setNoteInput] = useState("");
  const [notesList, setNotesList] = useState<string[]>([]);

  useEffect(() => {
    if (app?.notes) {
      const { customNotes } = parseCandidateNotes(app.notes, app.candidateName);
      const noteText = customNotes || app.notes;
      const items = noteText.split(/\s*\|\s*|\n+/).filter(Boolean);
      setNotesList(items);
    } else {
      setNotesList([]);
    }
  }, [app?.notes, app?.candidateName]);

  const handleAddNote = async () => {
    if (!noteInput.trim() || !app) return;
    const trimmed = noteInput.trim();
    const updated = [...notesList, trimmed];
    setNotesList(updated);
    setNoteInput("");
    try {
      await updateCandidateMutation.mutateAsync({
        id: app.id,
        data: {
          notes: updated.join(" | "),
        },
      });
    } catch (err) {
      console.error("Failed to save application note:", err);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
        <span>{t("applications.sections.notes")}</span>
      </h3>

      {notesList.length > 0 && (
        <div className="space-y-2 mb-3">
          {notesList.map((note, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
            >
              {note}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={t("applications.notePlaceholder")}
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAddNote();
            }
          }}
          className="flex-1 h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
        />
        {noteInput.trim() && (
          <Button
            size="sm"
            onClick={handleAddNote}
            className="h-9 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
          >
            {t("common.save")}
          </Button>
        )}
      </div>
    </div>
  );
}
