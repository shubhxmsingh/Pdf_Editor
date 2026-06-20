import { useEffect } from 'react';
import { usePdfEditor } from '../context/PdfEditorContext';

export function useKeyboardShortcuts() {
  const { editor, undo, redo, deleteSelected, setTool } = usePdfEditor();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (target.isContentEditable) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editor.selectedId) {
          e.preventDefault();
          deleteSelected();
        }
      }
      if (e.key === 'v' && !e.metaKey && !e.ctrlKey) setTool('select');
      if (e.key === 'h' && !e.metaKey && !e.ctrlKey) setTool('pan');
      if (e.key === 't' && !e.metaKey && !e.ctrlKey) setTool('text');
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor.selectedId, undo, redo, deleteSelected, setTool]);
}
