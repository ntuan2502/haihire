"use client";

interface EmailHtmlPreviewProps {
  body: string;
  title: string;
  className?: string;
}

/** Isolate untrusted email markup from application scripts, cookies and storage. */
export function EmailHtmlPreview({ body, title, className }: EmailHtmlPreviewProps) {
  return (
    <iframe
      title={title}
      sandbox=""
      referrerPolicy="no-referrer"
      className={className}
      style={{ width: "100%", minHeight: 480, border: 0 }}
      srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https:; base-uri 'none'; form-action 'none'"><style>body{margin:0;font:13px/1.6 sans-serif;overflow-wrap:anywhere}img{max-width:100%}</style></head><body>${body}</body></html>`}
    />
  );
}
