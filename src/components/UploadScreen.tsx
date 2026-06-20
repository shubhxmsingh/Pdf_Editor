import { useEffect, useRef, useState } from 'react';
import {
  FileText, ArrowRight, FileUp,
  Highlighter, Type, Pen, Download, Shapes, MousePointer2,
  CheckCircle2,
} from 'lucide-react';
import { usePdfEditor } from '../context/PdfEditorContext';

/* ── Stats row ──────────────────────────────────── */
const STATS = [
  { value: '100%', label: 'Browser-based' },
  { value: '0 MB', label: 'Server uploads' },
  { value: '∞', label: 'Free forever' },
];

/* ── Features ──────────────────────────────────── */
const FEATURES = [
  { icon: FileText,     title: 'Direct Text Editing',  desc: 'Click any text in your PDF and type over it. Font and style are matched.' },
  { icon: Highlighter,  title: 'Highlight & Annotate', desc: 'Mark up important sections with highlights and colour overlays.' },
  { icon: Type,         title: 'Add Text Anywhere',    desc: 'Insert text blocks at any position on any page.' },
  { icon: Pen,          title: 'Draw & Sign',          desc: 'Freehand pen tool for signatures and handwritten notes.' },
  { icon: Shapes,       title: 'Shapes & Markup',      desc: 'Rectangles and ellipses to frame, callout, or redact content.' },
  { icon: Download,     title: 'Instant Export',       desc: 'Download your edited PDF instantly — no watermarks ever.' },
];

/* ── Mockup toolbar items ──────────────────────── */
const MOCK_TOOLS = [
  { icon: MousePointer2, label: 'Select' },
  { icon: FileText,      label: 'Edit Text' },
  { icon: Type,          label: 'Add Text' },
  { icon: Highlighter,   label: 'Highlight' },
  { icon: Pen,           label: 'Draw' },
];

export function UploadScreen() {
  const { loadDocument } = usePdfEditor();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') return;
    setLoading(true);
    try { await loadDocument(file); } finally { setLoading(false); }
  };

  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop',     prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop',     prevent);
    };
  }, []);

  return (
    <div className="landing-root">
      {/* ── Grid background ───────────────────────── */}
      <div className="landing-grid-bg" aria-hidden="true" />

      {/* ── Nav ─────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <FileText size={20} />
          <span>PDFEdit<strong>Pro</strong></span>
        </div>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#privacy">Privacy</a>
        </div>
        <button className="btn-primary" onClick={() => inputRef.current?.click()}>
          Open PDF <ArrowRight size={15} />
        </button>
      </nav>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="landing-hero">
        {/* Left column */}
        <div className="hero-left">
          <div className="hero-badge">
            <span className="badge-dot" />
            FREE · NO SIGN-UP · 100% PRIVATE
          </div>

          <h1 className="hero-title">
            Edit any PDF<br />
            <span className="hero-accent">right in your browser</span>
          </h1>

          <p className="hero-sub">
            The only PDF editor that lets you click directly on existing text
            and type over it. No watermarks, no servers, no subscription — ever.
          </p>

          {/* CTA row */}
          <div className="hero-ctas">
            <div
              className={`cta-drop ${dragging ? 'dragging' : ''} ${loading ? 'loading' : ''}`}
              onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault(); setDragging(false);
                const f = e.dataTransfer.files[0]; if (f) handleFile(f);
              }}
              onClick={() => inputRef.current?.click()}
            >
              {loading
                ? <><div className="btn-spinner" /> Loading…</>
                : <><FileUp size={16} /> Upload PDF <ArrowRight size={15} /></>
              }
            </div>
            <button className="btn-ghost" onClick={() => inputRef.current?.click()}>
              <FileText size={16} /> Browse files
            </button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {/* Stats */}
          <div className="hero-stats">
            {STATS.map(({ value, label }) => (
              <div className="hero-stat" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — App mockup */}
        <div className="hero-right">
          <div className="mockup-card">
            {/* Window chrome */}
            <div className="mockup-chrome">
              <span className="chrome-dot dot-red" />
              <span className="chrome-dot dot-yellow" />
              <span className="chrome-dot dot-green" />
              <span className="chrome-title">PDF Editor — resume.pdf</span>
            </div>

            {/* Mini toolbar */}
            <div className="mockup-toolbar">
              {MOCK_TOOLS.map(({ icon: Icon, label }) => (
                <div
                  className={`mock-tool ${label === 'Edit Text' ? 'mock-tool-active' : ''}`}
                  key={label}
                  title={label}
                >
                  <Icon size={13} />
                </div>
              ))}
              <div className="mock-toolbar-sep" />
              <div className="mock-zoom">100%</div>
              <div className="mock-export">
                <Download size={12} /> Export
              </div>
            </div>

            {/* PDF page mockup */}
            <div className="mockup-body">
              {/* Sidebar */}
              <div className="mockup-sidebar">
                <div className="mock-page-thumb active" />
                <div className="mock-page-thumb" />
              </div>

              {/* PDF page mockup */}
              <div className="mockup-page">

                {/* Header — name being edited */}
                <div className="mock-text-editing">
                  <div className="mock-edit-overlay" />
                  <span className="mock-name">Alex Morgan</span>
                </div>
                <div className="mock-sub">San Francisco, CA &nbsp;·&nbsp; alex@morgan.dev</div>

                <div className="mock-divider" />

                {/* Education */}
                <div className="mock-section">Education</div>
                <div className="mock-row">
                  <div className="mock-line bold" style={{ width: '62%' }} />
                  <div className="mock-line" style={{ width: '22%' }} />
                </div>
                <div className="mock-line italic" style={{ width: '55%' }} />

                <div style={{ height: 8 }} />

                {/* Experience */}
                <div className="mock-section">Experience</div>
                <div className="mock-row">
                  <div className="mock-line bold" style={{ width: '58%' }} />
                  <div className="mock-line" style={{ width: '24%' }} />
                </div>
                <div className="mock-line" style={{ width: '80%' }} />
                <div className="mock-line" style={{ width: '68%' }} />

                <div style={{ height: 8 }} />

                {/* Skills */}
                <div className="mock-section">Skills</div>
                <div className="mock-line" style={{ width: '85%' }} />
                <div className="mock-line" style={{ width: '60%' }} />

                {/* Badge */}
                <div className="mock-edit-badge">
                  <CheckCircle2 size={11} /> 2 edits pending export
                </div>
              </div>
            </div>
          </div>

          {/* Floating tooltip */}
          <div className="mockup-tooltip">
            ✎ Click any text to edit in-place
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────── */}
      <section className="landing-features" id="features">
        <h2 className="features-title">Everything you need to edit PDFs</h2>
        <div className="features-grid">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div className="feature-card" key={title}>
              <div className="feature-icon"><Icon size={20} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="landing-footer">
        <span>© 2025 PDFEditPro · Powered by pdf-lib & pdfjs-dist · No data leaves your device</span>
      </footer>
    </div>
  );
}
