import sanitizeHtml from "sanitize-html";

const ALLOWED_RICH_TEXT_TAGS = [
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

/**
 * Sanitizes rich-text HTML authored via WYSIWYG before storing in PostgreSQL
 * to prevent Stored XSS while preserving structural formatting.
 */
export function sanitizeRichTextHtml(input: string): string {
  if (!input) return "";

  return sanitizeHtml(input, {
    allowedTags: ALLOWED_RICH_TEXT_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        if (!attribs.href) {
          return { tagName, attribs: {} as Record<string, string> };
        }
        return {
          tagName,
          attribs: {
            href: attribs.href,
            target: "_blank",
            rel: "noopener noreferrer nofollow",
          },
        };
      },
    },
  });
}
