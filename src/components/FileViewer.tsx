import { useMemo, useState } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import scss from "highlight.js/lib/languages/scss";
import markdown from "highlight.js/lib/languages/markdown";
import yaml from "highlight.js/lib/languages/yaml";
import ini from "highlight.js/lib/languages/ini";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import kotlin from "highlight.js/lib/languages/kotlin";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import ruby from "highlight.js/lib/languages/ruby";
import php from "highlight.js/lib/languages/php";
import swift from "highlight.js/lib/languages/swift";
import bash from "highlight.js/lib/languages/bash";
import sql from "highlight.js/lib/languages/sql";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import makefile from "highlight.js/lib/languages/makefile";
import { marked } from "marked";
import DOMPurify from "dompurify";
import "highlight.js/styles/github-dark.css";
import { getFileInfo } from "../utils/fileTypes";

const LANGS = {
  javascript, typescript, json, xml, css, scss, markdown, yaml, ini, python, java,
  kotlin, c, cpp, csharp, go, rust, ruby, php, swift, bash, sql, diff, dockerfile, makefile,
};
Object.entries(LANGS).forEach(([name, def]) => hljs.registerLanguage(name, def));

/** Above this many characters the text is shown without syntax colours. */
const MAX_HIGHLIGHT = 200_000;
/** Language auto-detection (unknown extensions) is only attempted on small files. */
const AUTO_DETECT_LIMIT = 20_000;
const MAX_CSV_ROWS = 500;

// Markdown comes from untrusted archives, so only plain formatting survives sanitizing:
// no images, media, forms or styling, and no attribute that could load a remote
// resource or draw over the rest of the page.
const MD_ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "a", "strong", "b", "em", "i", "del", "s",
  "code", "pre", "blockquote", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
  "sup", "sub", "kbd", "details", "summary", "span", "div",
];
const MD_ALLOWED_ATTR = ["href", "title", "align", "start", "colspan", "rowspan", "open"];

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function parseCsv(src: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      // header + MAX_CSV_ROWS rows are displayed; one extra row tells us that something is hidden
      if (rows.length > MAX_CSV_ROWS + 1) return rows;
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

function Toggle({
  options,
  value,
  onChange,
}: {
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
      {options.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={`rounded-md px-2.5 py-1 font-medium transition ${
            value === k ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function FileViewer({
  name,
  content,
  notice,
}: {
  name: string;
  content: string;
  /** Optional message shown above the content, e.g. when the preview is truncated. */
  notice?: string;
}) {
  const info = getFileInfo(name);
  const kind = info?.kind ?? "text";
  const [mode, setMode] = useState<"rendered" | "source">("rendered");
  const [copied, setCopied] = useState(false);

  // Pretty-print JSON when possible
  const source = useMemo(() => {
    if (kind === "json") {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        return content;
      }
    }
    return content;
  }, [content, kind]);

  // A trailing newline ends the last line, it does not start another one
  const lineCount = useMemo(() => {
    if (source === "") return 0;
    const n = source.split("\n").length;
    return source.endsWith("\n") ? n - 1 : n;
  }, [source]);

  const highlighted = useMemo(() => {
    if (source.length > MAX_HIGHLIGHT) return escapeHtml(source);
    const lang = info?.lang ?? "plaintext";
    if (lang !== "plaintext" && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(source, { language: lang, ignoreIllegals: true }).value;
      } catch {
        /* fall through */
      }
    }
    if (!info && source.length <= AUTO_DETECT_LIMIT) {
      // unknown extension: let highlight.js guess the language of small files
      try {
        return hljs.highlightAuto(source).value;
      } catch {
        /* fall through */
      }
    }
    return escapeHtml(source);
  }, [source, info]);

  const mdHtml = useMemo(() => {
    if (kind !== "markdown") return "";
    const raw = marked.parse(content, { async: false }) as string;
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: MD_ALLOWED_TAGS,
      ALLOWED_ATTR: MD_ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
    });
  }, [content, kind]);

  const csvRows = useMemo(() => {
    if (kind !== "csv") return [];
    const delimiter = name.toLowerCase().endsWith(".tsv") ? "\t" : ",";
    return parseCsv(content, delimiter);
  }, [content, kind, name]);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const hasRendered = kind === "markdown" || kind === "csv";
  const showSource = !hasRendered || mode === "source";
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join("\n"),
    [lineCount]
  );

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${info?.badge ?? "bg-slate-100 text-slate-600"}`}
        >
          {info?.label ?? "Plain text"}
        </span>
        <span className="text-xs text-slate-400">
          {`${lineCount.toLocaleString("en-US")} ${lineCount === 1 ? "line" : "lines"} · ${content.length.toLocaleString("en-US")} ${content.length === 1 ? "char" : "chars"}`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {hasRendered && (
            <Toggle
              options={[
                ["rendered", kind === "markdown" ? "Preview" : "Table"],
                ["source", "Source"],
              ]}
              value={mode}
              onChange={(v) => setMode(v as "rendered" | "source")}
            />
          )}
          <button
            onClick={copy}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>

      {notice && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{notice}</div>
      )}

      <div className="max-h-[400px] overflow-auto">
        {!showSource && kind === "markdown" && (
          <article className="md-body p-5" dangerouslySetInnerHTML={{ __html: mdHtml }} />
        )}

        {!showSource && kind === "csv" && (
          <div className="p-3">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-indigo-600 text-white">
                <tr>
                  <th className="px-2 py-1.5 font-medium opacity-70">#</th>
                  {(csvRows[0] ?? []).map((h, i) => (
                    <th key={i} className="whitespace-nowrap px-2 py-1.5 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvRows.slice(1, MAX_CSV_ROWS + 1).map((r, i) => (
                  <tr key={i} className="odd:bg-white even:bg-slate-50">
                    <td className="px-2 py-1 text-slate-400">{i + 1}</td>
                    {r.map((cell, j) => (
                      <td key={j} className="whitespace-nowrap border-t border-slate-100 px-2 py-1">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {csvRows.length > MAX_CSV_ROWS + 1 && (
              <p className="mt-2 text-center text-xs text-slate-400">
                Showing the first {MAX_CSV_ROWS} rows
              </p>
            )}
          </div>
        )}

        {/* w-max: the dark background must span the longest line, not just the visible width */}
        {showSource && (
          <div className="flex w-max min-w-full bg-[#0d1117] font-mono text-xs leading-5">
            <pre
              aria-hidden
              className="sticky left-0 select-none border-r border-white/10 bg-[#0d1117] px-3 py-3 text-right text-slate-500"
            >
              {lineNumbers}
            </pre>
            <pre className="flex-1 px-4 py-3">
              <code
                className="hljs !bg-transparent !p-0 text-slate-200"
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
