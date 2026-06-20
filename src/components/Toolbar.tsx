import {
  MousePointer2,
  Hand,
  Type,
  Highlighter,
  Pencil,
  Square,
  Circle,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Trash2,
  FilePlus2,
  FileEdit,
} from 'lucide-react';
import { usePdfEditor } from '../context/PdfEditorContext';
import { exportPdfWithAnnotations, downloadPdf } from '../utils/pdfExporter';
import type { Tool } from '../types';

const TOOLS: { id: Tool; icon: typeof MousePointer2; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'pan', icon: Hand, label: 'Pan' },
  { id: 'editText', icon: FileEdit, label: 'Edit Text (click text to edit)' },
  { id: 'text', icon: Type, label: 'Add Text' },
  { id: 'highlight', icon: Highlighter, label: 'Highlight' },
  { id: 'draw', icon: Pencil, label: 'Draw' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse' },
];

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#000000', '#facc15'];

export function Toolbar() {
  const {
    document,
    annotations,
    textEdits,
    editor,
    canUndo,
    canRedo,
    setTool,
    setColor,
    setStrokeWidth,
    setFontSize,
    setZoom,
    deleteSelected,
    undo,
    redo,
    clearDocument,
  } = usePdfEditor();

  const handleExport = async () => {
    if (!document) return;
    const bytes = await exportPdfWithAnnotations(document.pdfBytes, annotations, textEdits);
    const name = document.name.replace(/\.pdf$/i, '') + '-edited.pdf';
    downloadPdf(bytes, name);
  };

  const isEditTextActive = editor.tool === 'editText';

  return (
    <header className="toolbar">
      <div className="toolbar-section">
        <button className="toolbar-btn ghost" onClick={clearDocument} title="Open new PDF">
          <FilePlus2 size={18} />
        </button>
        <div className="toolbar-divider" />
        {TOOLS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`toolbar-btn ${editor.tool === id ? 'active' : ''} ${id === 'editText' ? 'edit-text-btn' : ''}`}
            onClick={() => setTool(id)}
            title={label}
          >
            <Icon size={18} />
            {id === 'editText' && <span>Edit Text</span>}
          </button>
        ))}
      </div>

      <div className="toolbar-section">
        {!isEditTextActive && (
          <>
            <div className="color-picker">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-swatch ${editor.color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>
            <div className="toolbar-divider" />
          </>
        )}
        {(editor.tool === 'draw' || editor.tool === 'rectangle' || editor.tool === 'ellipse') && (
          <>
            <label className="toolbar-control">
              <span>Stroke</span>
              <input
                type="range"
                min={1}
                max={12}
                value={editor.strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
              />
            </label>
            <div className="toolbar-divider" />
          </>
        )}
        {editor.tool === 'text' && (
          <>
            <label className="toolbar-control">
              <span>Size</span>
              <input
                type="range"
                min={10}
                max={48}
                value={editor.fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </label>
            <div className="toolbar-divider" />
          </>
        )}
        {isEditTextActive && (
          <span className="toolbar-hint">
            Click any text on the page to edit it directly
          </span>
        )}
        {!isEditTextActive && (
          <>
            <button className="toolbar-btn" onClick={undo} disabled={!canUndo} title="Undo">
              <Undo2 size={18} />
            </button>
            <button className="toolbar-btn" onClick={redo} disabled={!canRedo} title="Redo">
              <Redo2 size={18} />
            </button>
            <button
              className="toolbar-btn"
              onClick={deleteSelected}
              disabled={!editor.selectedId}
              title="Delete selected"
            >
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>

      <div className="toolbar-section">
        <button className="toolbar-btn" onClick={() => setZoom(editor.zoom - 0.15)} title="Zoom out">
          <ZoomOut size={18} />
        </button>
        <span className="zoom-label">{Math.round(editor.zoom * 100)}%</span>
        <button className="toolbar-btn" onClick={() => setZoom(editor.zoom + 0.15)} title="Zoom in">
          <ZoomIn size={18} />
        </button>
        <div className="toolbar-divider" />
        <button className="toolbar-btn primary" onClick={handleExport} title="Download PDF">
          <Download size={18} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}
