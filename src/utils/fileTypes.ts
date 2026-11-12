export type Kind = "code" | "markdown" | "csv" | "json" | "text";

export interface FileInfo {
  /** highlight.js language id (or "plaintext") */
  lang: string;
  /** Human readable label shown in the badge */
  label: string;
  kind: Kind;
  /** Tailwind classes for the badge */
  badge: string;
}

const BADGE = {
  yellow: "bg-yellow-100 text-yellow-800",
  blue: "bg-blue-100 text-blue-800",
  orange: "bg-orange-100 text-orange-800",
  green: "bg-emerald-100 text-emerald-800",
  purple: "bg-purple-100 text-purple-800",
  red: "bg-red-100 text-red-800",
  pink: "bg-pink-100 text-pink-800",
  cyan: "bg-cyan-100 text-cyan-800",
  gray: "bg-slate-100 text-slate-700",
};

const T = (lang: string, label: string, badge: string, kind: Kind = "code"): FileInfo => ({
  lang,
  label,
  badge,
  kind,
});

const BY_EXT: Record<string, FileInfo> = {
  js: T("javascript", "JavaScript", BADGE.yellow),
  mjs: T("javascript", "JavaScript", BADGE.yellow),
  cjs: T("javascript", "JavaScript", BADGE.yellow),
  jsx: T("javascript", "JSX", BADGE.yellow),
  ts: T("typescript", "TypeScript", BADGE.blue),
  tsx: T("typescript", "TSX", BADGE.blue),
  json: T("json", "JSON", BADGE.green, "json"),
  jsonc: T("json", "JSON", BADGE.green, "json"),
  html: T("xml", "HTML", BADGE.orange),
  htm: T("xml", "HTML", BADGE.orange),
  vue: T("xml", "Vue", BADGE.green),
  xml: T("xml", "XML", BADGE.orange),
  svg: T("xml", "SVG", BADGE.pink),
  css: T("css", "CSS", BADGE.blue),
  scss: T("scss", "SCSS", BADGE.pink),
  md: T("markdown", "Markdown", BADGE.gray, "markdown"),
  markdown: T("markdown", "Markdown", BADGE.gray, "markdown"),
  yml: T("yaml", "YAML", BADGE.red),
  yaml: T("yaml", "YAML", BADGE.red),
  toml: T("ini", "TOML", BADGE.gray),
  ini: T("ini", "INI", BADGE.gray),
  env: T("ini", "ENV", BADGE.gray),
  py: T("python", "Python", BADGE.blue),
  java: T("java", "Java", BADGE.red),
  kt: T("kotlin", "Kotlin", BADGE.purple),
  c: T("c", "C", BADGE.gray),
  h: T("c", "C Header", BADGE.gray),
  cpp: T("cpp", "C++", BADGE.blue),
  cs: T("csharp", "C#", BADGE.purple),
  go: T("go", "Go", BADGE.cyan),
  rs: T("rust", "Rust", BADGE.orange),
  rb: T("ruby", "Ruby", BADGE.red),
  php: T("php", "PHP", BADGE.purple),
  swift: T("swift", "Swift", BADGE.orange),
  sh: T("bash", "Shell", BADGE.green),
  bash: T("bash", "Shell", BADGE.green),
  zsh: T("bash", "Shell", BADGE.green),
  sql: T("sql", "SQL", BADGE.cyan),
  diff: T("diff", "Diff", BADGE.green),
  patch: T("diff", "Patch", BADGE.green),
  csv: T("plaintext", "CSV", BADGE.green, "csv"),
  tsv: T("plaintext", "TSV", BADGE.green, "csv"),
  txt: T("plaintext", "Text", BADGE.gray, "text"),
  log: T("plaintext", "Log", BADGE.gray, "text"),
};

const BY_NAME: Record<string, FileInfo> = {
  dockerfile: T("dockerfile", "Dockerfile", BADGE.cyan),
  makefile: T("makefile", "Makefile", BADGE.gray),
  ".gitignore": T("plaintext", "Git ignore", BADGE.gray, "text"),
  ".env": T("ini", "ENV", BADGE.gray),
  license: T("plaintext", "License", BADGE.gray, "text"),
  readme: T("markdown", "Readme", BADGE.gray, "markdown"),
};

export function getFileInfo(name: string): FileInfo | null {
  const lower = name.toLowerCase();
  if (BY_NAME[lower]) return BY_NAME[lower];
  const dot = lower.lastIndexOf(".");
  if (dot === -1) return null;
  return BY_EXT[lower.slice(dot + 1)] ?? null;
}

export const isKnownTextFile = (name: string) => getFileInfo(name) !== null;
