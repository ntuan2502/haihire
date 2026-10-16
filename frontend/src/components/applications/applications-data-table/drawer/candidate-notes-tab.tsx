"use client";

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

interface CandidateNotesTabProps {
  notesList: string[];
  noteInput: string;
  onNoteInputChange: (val: string) => void;
  onAddNote: () => void;
}

export function CandidateNotesTab({
  notesList,
  noteInput,
  onNoteInputChange,
  onAddNote,
}: CandidateNotesTabProps) {
  const { t } = useI18n();

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
          onChange={(e) => onNoteInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAddNote();
            }
          }}
          className="flex-1 h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
        />
        {noteInput.trim() && (
          <Button
            size="sm"
            onClick={onAddNote}
            className="h-9 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
          >
            {t("candidates.addNote")}
          </Button>
        )}
      </div>
    </div>
  );
}
