"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Undo2,
} from "lucide-react";
import { cn } from "cn";
import { useI18n } from "@/i18n";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  ariaLabel?: string;
  hasError?: boolean;
  className?: string;
}

const HTML_TAG_REGEX =
  /<\/?(?:p|br|h[1-6]|ul|ol|li|strong|b|em|i|u|s|blockquote|a|div|span)\b[^>]*>/i;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeEditorContent(raw: string): string {
  if (!raw) return "";
  if (HTML_TAG_REGEX.test(raw)) return raw;
  const normalized = raw.replace(/\r\n?/g, "\n");
  return normalized
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function isSafeLinkUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/|mailto:|\/)/i.test(trimmed);
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = "",
  ariaLabel,
  hasError = false,
  className,
}: RichTextEditorProps) {
  const { t } = useI18n();
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);

  useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
  }, [onChange, onBlur]);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: normalizeEditorContent(value || ""),
    editorProps: {
      attributes: {
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        class: cn(
          "min-h-[160px] max-h-[360px] overflow-y-auto px-3 py-2.5 text-xs text-foreground outline-none",
          "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-2 [&_h2]:mb-1",
          "[&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-1.5 [&_h3]:mb-1",
          "[&_p]:leading-relaxed [&_p]:mb-1.5",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5",
          "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
          "[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.is-editor-empty:first-child::before]:text-muted-foreground",
          "[&_.is-editor-empty:first-child::before]:float-left",
          "[&_.is-editor-empty:first-child::before]:h-0",
          "[&_.is-editor-empty:first-child::before]:pointer-events-none",
        ),
      },
      transformPastedHTML(html) {
        return html
          .replace(/\sstyle="[^"]*"/gi, "")
          .replace(/\sstyle='[^']*'/gi, "");
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChangeRef.current(instance.isEmpty ? "" : instance.getHTML());
    },
    onBlur: () => {
      onBlurRef.current?.();
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const nextValue = normalizeEditorContent(value || "");
    const currentValue = editor.isEmpty ? "" : editor.getHTML();
    if (nextValue !== currentValue) {
      editor.commands.setContent(nextValue, { emitUpdate: false });
    }
  }, [editor, value]);

  const handleSetLink = () => {
    if (!editor) return;
    const previousUrl = (editor.getAttributes("link").href as string) || "";
    const entered = window.prompt(
      t("jobs.wizard.editor.linkPrompt"),
      previousUrl,
    );
    if (entered === null) return;
    const trimmed = entered.trim();
    if (trimmed === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!isSafeLinkUrl(trimmed)) return;
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: trimmed })
      .run();
  };

  const toolbarBtnClass = (active: boolean) =>
    cn(
      "inline-flex items-center justify-center h-7 w-7 rounded-md text-xs transition-colors cursor-pointer",
      active
        ? "bg-primary/15 text-primary font-semibold"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
    );

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-transparent shadow-xs transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        hasError &&
          "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5 rounded-t-md">
        <button
          type="button"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          aria-label={t("jobs.wizard.editor.heading2")}
          title={t("jobs.wizard.editor.heading2")}
          aria-pressed={editor?.isActive("heading", { level: 2 }) ?? false}
          className={toolbarBtnClass(
            editor?.isActive("heading", { level: 2 }) ?? false,
          )}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
          aria-label={t("jobs.wizard.editor.heading3")}
          title={t("jobs.wizard.editor.heading3")}
          aria-pressed={editor?.isActive("heading", { level: 3 }) ?? false}
          className={toolbarBtnClass(
            editor?.isActive("heading", { level: 3 }) ?? false,
          )}
        >
          <Heading3 className="h-3.5 w-3.5" />
        </button>

        <span className="mx-0.5 h-4 w-px bg-border" />

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          aria-label={t("jobs.wizard.editor.bold")}
          title={t("jobs.wizard.editor.bold")}
          aria-pressed={editor?.isActive("bold") ?? false}
          className={toolbarBtnClass(editor?.isActive("bold") ?? false)}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          aria-label={t("jobs.wizard.editor.italic")}
          title={t("jobs.wizard.editor.italic")}
          aria-pressed={editor?.isActive("italic") ?? false}
          className={toolbarBtnClass(editor?.isActive("italic") ?? false)}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>

        <span className="mx-0.5 h-4 w-px bg-border" />

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          aria-label={t("jobs.wizard.editor.bulletList")}
          title={t("jobs.wizard.editor.bulletList")}
          aria-pressed={editor?.isActive("bulletList") ?? false}
          className={toolbarBtnClass(editor?.isActive("bulletList") ?? false)}
        >
          <List className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          aria-label={t("jobs.wizard.editor.orderedList")}
          title={t("jobs.wizard.editor.orderedList")}
          aria-pressed={editor?.isActive("orderedList") ?? false}
          className={toolbarBtnClass(editor?.isActive("orderedList") ?? false)}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={handleSetLink}
          aria-label={t("jobs.wizard.editor.link")}
          title={t("jobs.wizard.editor.link")}
          aria-pressed={editor?.isActive("link") ?? false}
          className={toolbarBtnClass(editor?.isActive("link") ?? false)}
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>

        <span className="mx-0.5 h-4 w-px bg-border" />

        <button
          type="button"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
          aria-label={t("jobs.wizard.editor.undo")}
          title={t("jobs.wizard.editor.undo")}
          className={cn(
            toolbarBtnClass(false),
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
          aria-label={t("jobs.wizard.editor.redo")}
          title={t("jobs.wizard.editor.redo")}
          className={cn(
            toolbarBtnClass(false),
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
