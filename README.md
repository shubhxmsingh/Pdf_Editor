# PDF Editor

A browser-based PDF editor built with React, TypeScript, and Vite. Upload a PDF, annotate it with text, highlights, drawings, and shapes, then export the edited file — all client-side, no server required.

## Features

- **Upload** — Drag & drop or browse for PDF files
- **View** — Page thumbnails, zoom, and page navigation
- **Annotate** — Text, highlights, freehand draw, rectangles, ellipses
- **Edit** — Select, move focus, undo/redo, delete annotations
- **Export** — Download the annotated PDF with embedded changes

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `H` | Pan tool |
| `T` | Text tool |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Delete` / `Backspace` | Delete selected annotation |

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for dev & build
- [pdf.js](https://mozilla.github.io/pdf.js/) for rendering
- [pdf-lib](https://pdf-lib.js.org/) for export
- [Lucide React](https://lucide.dev/) for icons

## Build

```bash
npm run build
npm run preview
```
