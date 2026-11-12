import { useCallback, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import FileViewer from "./components/FileViewer";
import { isKnownTextFile } from "./utils/fileTypes";

type Entry = {
  path: string;
  name: string;
  dir: boolean;
  size: number;
  date: Date;
  file: JSZip.JSZipObject;
};

const IMG_EXT = /\.(png|jpe?g|gif|webp|bmp|ico)$/i;
/** Text previews show at most the first 512 KB of a file. */
const PREVIEW_LIMIT = 512 * 1024;
/** Files with an unknown extension are only checked for text content below this size. */
const SNIFF_LIMIT = 200_000;

const fmtSize = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

const icon = (e: Entry) => {
  if (e.dir) return "📁";
  if (IMG_EXT.test(e.name)) return "🖼️";
  if (/\.zip$/i.test(e.name)) return "🗜️";
  if (isKnownTextFile(e.name)) return "📄";
  return "📦";
};

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [zipName, setZipName] = useState("");
  const [zipSize, setZipSize] = useState(0);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Ids of the latest archive load / preview request. A slower, older request
  // must never overwrite the result of a newer one.
  const loadId = useRef(0);
  const previewId = useRef(0);
  const imgUrlRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    previewId.current++;
    setSelected(null);
    setText(null);
    setNotice("");
    setPreviewing(false);
    if (imgUrlRef.current) URL.revokeObjectURL(imgUrlRef.current);
    imgUrlRef.current = null;
    setImgUrl(null);
  }, []);

  const loadZip = useCallback(
    async (f: File) => {
      const id = ++loadId.current;
      setError("");
      setLoading(true);
      reset();
      try {
        // createFolders: also list parent folders when the archive has no explicit folder entries
        const zip = await JSZip.loadAsync(f, { createFolders: true });
        if (id !== loadId.current) return;
        const list: Entry[] = [];
        zip.forEach((path, file) => {
          list.push({
            path,
            name: path.replace(/\/$/, "").split("/").pop() || path,
            dir: file.dir,
            size: (file as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0,
            date: file.date,
            file,
          });
        });
        list.sort((a, b) => a.path.localeCompare(b.path));
        setEntries(list);
        setZipName(f.name);
        setZipSize(f.size);
      } catch {
        if (id !== loadId.current) return;
        setEntries([]);
        setZipName("");
        setError("This file is not a valid ZIP archive, or it is password-protected.");
      } finally {
        if (id === loadId.current) setLoading(false);
      }
    },
    [reset]
  );

  const open = async (e: Entry) => {
    if (e.dir) return;
    reset();
    const id = previewId.current;
    setError("");
    setSelected(e);
    const isImage = IMG_EXT.test(e.name);
    if (!isImage && !isKnownTextFile(e.name) && e.size >= SNIFF_LIMIT) return;
    setPreviewing(true);
    try {
      if (isImage) {
        const blob = await e.file.async("blob");
        if (id !== previewId.current) return;
        const url = URL.createObjectURL(blob);
        imgUrlRef.current = url;
        setImgUrl(url);
      } else {
        const buf = await e.file.async("uint8array");
        if (id !== previewId.current) return;
        // NUL bytes near the start mean binary data: no text preview
        if (buf.subarray(0, 2000).some((b) => b === 0)) return;
        const truncated = buf.length > PREVIEW_LIMIT;
        // stream: true keeps a truncated preview from ending in a broken character
        setText(new TextDecoder("utf-8").decode(buf.subarray(0, PREVIEW_LIMIT), { stream: truncated }));
        if (truncated) {
          setNotice(
            `Preview truncated: showing the first ${fmtSize(PREVIEW_LIMIT)} of ${fmtSize(buf.length)}. Download the file to see all of it.`
          );
        }
      }
    } catch {
      // Unreadable entry (for example corrupted data): the "preview not available" message is shown
    } finally {
      if (id === previewId.current) setPreviewing(false);
    }
  };

  const download = async (e: Entry) => {
    setError("");
    try {
      const blob = await e.file.async("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = e.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(`Could not extract "${e.name}". This entry of the archive appears to be corrupted.`);
    }
  };

  const onDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    setDrag(false);
    const f = ev.dataTransfer.files?.[0];
    if (f) loadZip(f);
  };

  const filtered = useMemo(
    () => entries.filter((e) => e.path.toLowerCase().includes(query.toLowerCase())),
    [entries, query]
  );
  const files = entries.filter((e) => !e.dir);
  const total = files.reduce((s, e) => s + e.size, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-2xl shadow-lg shadow-indigo-200">
            🗜️
          </div>
          <h1 className="text-3xl font-bold tracking-tight">ZIP File Viewer</h1>
          <p className="mt-2 text-slate-500">
            Drag and drop a ZIP file to browse its contents. Everything is processed locally in your browser.
          </p>
        </header>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
            drag ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white hover:border-indigo-400"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && loadZip(e.target.files[0])}
          />
          <div className="text-4xl">📥</div>
          <p className="mt-2 font-medium">
            {loading ? "Reading..." : "Click here or drag a ZIP file"}
          </p>
          {zipName && (
            <p className="mt-1 text-sm text-slate-500">
              {zipName} · {fmtSize(zipSize)}
            </p>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        )}

        {zipName && !loading && entries.length === 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-center text-slate-500">
            This archive is empty.
          </div>
        )}

        {entries.length > 0 && (
          <>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                ["Files", files.length.toLocaleString("en-US")],
                ["Folders", (entries.length - files.length).toLocaleString("en-US")],
                ["Uncompressed size", fmtSize(total)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="text-xs text-slate-500">{k}</div>
                  <div className="text-lg font-semibold">{v}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-3">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search files..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
                <ul className="max-h-[480px] divide-y divide-slate-100 overflow-auto">
                  {filtered.map((e) => {
                    const depth = e.path.replace(/\/$/, "").split("/").length - 1;
                    return (
                      <li
                        key={e.path}
                        onClick={() => open(e)}
                        style={{ paddingLeft: 12 + depth * 16 }}
                        className={`flex items-center gap-2 py-2 pr-3 text-sm ${
                          e.dir ? "bg-slate-50 font-medium" : "cursor-pointer hover:bg-indigo-50"
                        } ${selected?.path === e.path ? "bg-indigo-100" : ""}`}
                      >
                        <span>{icon(e)}</span>
                        <span className="min-w-0 flex-1 truncate">{e.name}</span>
                        {!e.dir && <span className="text-xs text-slate-400">{fmtSize(e.size)}</span>}
                      </li>
                    );
                  })}
                  {filtered.length === 0 && (
                    <li className="p-6 text-center text-sm text-slate-400">No results found</li>
                  )}
                </ul>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {selected ? (
                  <>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{selected.path}</div>
                        <div className="text-xs text-slate-400">
                          {fmtSize(selected.size)} · {selected.date.toLocaleString("en-US")}
                        </div>
                      </div>
                      <button
                        onClick={() => download(selected)}
                        className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                      >
                        Download
                      </button>
                    </div>
                    {previewing ? (
                      <p className="py-16 text-center text-sm text-slate-400">Loading preview...</p>
                    ) : imgUrl ? (
                      <div className="max-h-[430px] overflow-auto bg-[conic-gradient(#f1f5f9_25%,#fff_0_50%,#f1f5f9_0_75%,#fff_0)] bg-[length:20px_20px] p-3">
                        <img src={imgUrl} alt={selected.name} className="mx-auto max-h-[400px] rounded" />
                      </div>
                    ) : text !== null ? (
                      <FileViewer key={selected.path} name={selected.name} content={text} notice={notice} />
                    ) : (
                      <p className="py-16 text-center text-sm text-slate-400">
                        Preview is not available for this file type. You can download it instead.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex h-full min-h-[240px] items-center justify-center p-6 text-sm text-slate-400">
                    Select a file to preview its contents
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
