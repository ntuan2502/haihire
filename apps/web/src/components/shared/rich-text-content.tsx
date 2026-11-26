"use client";

import DOMPurify from "dompurify";
import { cn } from "cn";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
];

const ALLOWED_ATTR = ["href", "target", "rel"];

const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;

function sanitizeOnServer(html: string): string {
  return html
    .replace(/<(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]*(on\w+\s*=|javascript:)[^>]*>/gi, "");
}

function sanitizeHtml(content: string): string {
  if (typeof window === "undefined") {
    return sanitizeOnServer(content);
  }
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

interface RichTextContentProps {
  content?: string | null;
  emptyFallback?: string;
  className?: string;
}

export function RichTextContent({
  content,
  emptyFallback = "",
  className,
}: RichTextContentProps) {
  const value = content?.trim() || "";

  if (!value) {
    if (!emptyFallback) return null;
    return (
      <p className={cn("text-sm text-muted-foreground italic", className)}>
        {emptyFallback}
      </p>
    );
  }

  if (!HTML_TAG_REGEX.test(value)) {
    return (
      <div
        className={cn(
          "text-sm text-muted-foreground leading-relaxed whitespace-pre-line font-normal break-words [overflow-wrap:anywhere]",
          className,
        )}
      >
        {value}
      </div>
    );
  }

  const cleanHtml = sanitizeHtml(value);

  return (
    <div
      className={cn(
        "text-sm text-muted-foreground leading-relaxed font-normal space-y-2.5 break-words",
        "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:pt-2 [&_h2]:pb-0.5",
        "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:pt-1.5",
        "[&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_b]:font-semibold [&_b]:text-foreground",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1",
        "[&_li]:leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:break-all hover:[&_a]:opacity-80",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
