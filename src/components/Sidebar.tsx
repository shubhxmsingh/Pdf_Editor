import { useEffect, useRef } from 'react';
import { usePdfEditor } from '../context/PdfEditorContext';
import { loadPdfDocument, renderPageThumbnail } from '../utils/pdfLoader';

export function Sidebar() {
  const { document, editor, setCurrentPage } = usePdfEditor();
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (!document) return;

    let cancelled = false;

    (async () => {
      const pdfDoc = await loadPdfDocument(document.pdfBytes);
      if (cancelled) return;

      for (let i = 0; i < document.pageCount; i++) {
        const canvas = canvasRefs.current[i];
        if (canvas) await renderPageThumbnail(pdfDoc, i, canvas);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [document]);

  if (!document) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Pages</span>
        <span className="sidebar-count">{document.pageCount}</span>
      </div>
      <div className="sidebar-pages">
        {Array.from({ length: document.pageCount }, (_, i) => (
          <button
            key={i}
            className={`page-thumb ${editor.currentPage === i ? 'active' : ''}`}
            onClick={() => setCurrentPage(i)}
          >
            <canvas ref={(el) => { canvasRefs.current[i] = el; }} />
            <span className="page-number">{i + 1}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
