import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePdfEditor } from '../context/PdfEditorContext';
import { PageCanvas } from './PageCanvas';

export function PdfViewer() {
  const { document, editor, setCurrentPage } = usePdfEditor();

  if (!document) return null;

  return (
    <main className="viewer">
      <div className="viewer-scroll">
        <div className="viewer-content">
          <PageCanvas pageIndex={editor.currentPage} />
        </div>
      </div>

      <footer className="page-nav">
        <button
          className="nav-btn"
          disabled={editor.currentPage === 0}
          onClick={() => setCurrentPage(editor.currentPage - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="page-indicator">
          Page {editor.currentPage + 1} of {document.pageCount}
        </span>
        <button
          className="nav-btn"
          disabled={editor.currentPage >= document.pageCount - 1}
          onClick={() => setCurrentPage(editor.currentPage + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </footer>
    </main>
  );
}
