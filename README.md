# ZIP File Viewer

Browse the contents of a ZIP archive in your browser, without extracting it.

The archive is read locally on your device. Nothing is uploaded, and once the page has loaded it makes no network requests.

![ZIP File Viewer showing a folder tree and a syntax-highlighted file](docs/Screenshot.png)

## Features

- **Open an archive** by dragging it onto the page or by picking it from disk.
- **Folder tree** with the size of every file, plus the number of files and folders and the total uncompressed size.
- **Search** by file or folder name.
- **Preview files** without extracting the archive:
  - source code with syntax highlighting and line numbers (JavaScript, TypeScript, Python, Java, Kotlin, C, C++, C#, Go, Rust, PHP, Ruby, Swift, HTML, XML, CSS, SCSS, YAML, TOML, SQL, shell scripts, Dockerfile, Makefile, diff and more);
  - Markdown as a formatted page, with a switch to the raw source;
  - CSV and TSV as a table, with a switch to the raw source;
  - JSON, pretty-printed automatically;
  - images (PNG, JPEG, GIF, WebP, BMP, ICO).
- **Copy** the text of a file, or **download** any single file from the archive.

## Limits

- Password-protected archives are not supported.
- Text previews show the first 512 KB of a file. A notice appears when a preview is cut short; a download always contains the whole file.
- Syntax colours are skipped for text longer than 200,000 characters.
- CSV and TSV tables show the first 500 rows.
- A file with an unrecognised extension is previewed as text only if it is smaller than 200,000 bytes and does not contain binary data.
- Text is decoded as UTF-8.
- Markdown previews show text formatting only: images, media and other embedded content are not loaded.
- SVG files are shown as source code.

## Getting started

Requires [Node.js](https://nodejs.org/) 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Then open the address printed in the terminal.

### Production build

```bash
npm run build
```

The build produces a single self-contained file, `dist/index.html`, with all scripts and styles inlined. Open it directly in a browser or put it on any static host. `npm run preview` serves the build locally.

## Built with

[React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/), [Tailwind CSS](https://tailwindcss.com/), [JSZip](https://stuk.github.io/jszip/), [highlight.js](https://highlightjs.org/), [marked](https://marked.js.org/) and [DOMPurify](https://github.com/cure53/DOMPurify).
