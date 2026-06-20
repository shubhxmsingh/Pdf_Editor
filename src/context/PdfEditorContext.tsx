import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type { Annotation, AnnotationInput, EditorState, PdfDocument, TextEdit, Tool } from '../types';
import { generateId } from '../utils/geometry';

interface PdfEditorContextValue {
  document: PdfDocument | null;
  annotations: Annotation[];
  textEdits: TextEdit[];
  editor: EditorState;
  canUndo: boolean;
  canRedo: boolean;
  loadDocument: (file: File) => Promise<void>;
  clearDocument: () => void;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  setZoom: (zoom: number) => void;
  setCurrentPage: (page: number) => void;
  setSelectedId: (id: string | null) => void;
  addAnnotation: (annotation: AnnotationInput) => string;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  deleteSelected: () => void;
  undo: () => void;
  redo: () => void;
  /** Upsert a direct text edit — if the key already exists it will be updated */
  setTextEdit: (edit: TextEdit) => void;
  clearTextEdits: () => void;
}

type HistoryAction =
  | { type: 'SET'; annotations: Annotation[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

interface HistoryState {
  past: Annotation[][];
  present: Annotation[];
  future: Annotation[][];
}

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'SET':
      return {
        past: [...state.past, state.present],
        present: action.annotations,
        future: [],
      };
    case 'UNDO':
      if (state.past.length === 0) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      };
    case 'REDO':
      if (state.future.length === 0) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      };
    default:
      return state;
  }
}

type TextEditAction =
  | { type: 'SET'; edit: TextEdit }
  | { type: 'CLEAR' };

function textEditReducer(state: TextEdit[], action: TextEditAction): TextEdit[] {
  switch (action.type) {
    case 'SET': {
      const idx = state.findIndex((e) => e.key === action.edit.key);
      if (idx === -1) return [...state, action.edit];
      const next = [...state];
      next[idx] = action.edit;
      return next;
    }
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

const defaultEditor: EditorState = {
  tool: 'select',
  color: '#2563eb',
  strokeWidth: 2,
  fontSize: 16,
  zoom: 1,
  currentPage: 0,
  selectedId: null,
};

const PdfEditorContext = createContext<PdfEditorContextValue | null>(null);

export function PdfEditorProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useReducer(
    (_: PdfDocument | null, action: PdfDocument | null) => action,
    null,
  );
  const [history, dispatchHistory] = useReducer(historyReducer, {
    past: [],
    present: [],
    future: [],
  });
  const [textEdits, dispatchTextEdits] = useReducer(textEditReducer, []);
  const [editor, setEditor] = useReducer(
    (state: EditorState, action: Partial<EditorState>) => ({ ...state, ...action }),
    defaultEditor,
  );

  const loadDocument = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(buffer);

    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
    const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise;

    setDocument({
      file,
      name: file.name,
      pageCount: pdfDoc.numPages,
      pdfBytes,
    });
    dispatchHistory({ type: 'SET', annotations: [] });
    dispatchTextEdits({ type: 'CLEAR' });
    setEditor({ currentPage: 0, selectedId: null, zoom: 1 });
  }, []);

  const clearDocument = useCallback(() => {
    setDocument(null);
    dispatchHistory({ type: 'SET', annotations: [] });
    dispatchTextEdits({ type: 'CLEAR' });
    setEditor(defaultEditor);
  }, []);

  const setAnnotations = useCallback((annotations: Annotation[]) => {
    dispatchHistory({ type: 'SET', annotations });
  }, []);

  const addAnnotation = useCallback(
    (annotation: AnnotationInput) => {
      const id = generateId();
      setAnnotations([...history.present, { ...annotation, id } as Annotation]);
      return id;
    },
    [history.present, setAnnotations],
  );

  const updateAnnotation = useCallback(
    (id: string, updates: Partial<Annotation>) => {
      setAnnotations(
        history.present.map((a) => (a.id === id ? ({ ...a, ...updates } as Annotation) : a)),
      );
    },
    [history.present, setAnnotations],
  );

  const deleteAnnotation = useCallback(
    (id: string) => {
      setAnnotations(history.present.filter((a) => a.id !== id));
      if (editor.selectedId === id) setEditor({ selectedId: null });
    },
    [history.present, editor.selectedId, setAnnotations],
  );

  const deleteSelected = useCallback(() => {
    if (editor.selectedId) deleteAnnotation(editor.selectedId);
  }, [editor.selectedId, deleteAnnotation]);

  const setTextEdit = useCallback((edit: TextEdit) => {
    dispatchTextEdits({ type: 'SET', edit });
  }, []);

  const clearTextEdits = useCallback(() => {
    dispatchTextEdits({ type: 'CLEAR' });
  }, []);

  const value = useMemo<PdfEditorContextValue>(
    () => ({
      document,
      annotations: history.present,
      textEdits,
      editor,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      loadDocument,
      clearDocument,
      setTool: (tool) => setEditor({ tool, selectedId: null }),
      setColor: (color) => setEditor({ color }),
      setStrokeWidth: (strokeWidth) => setEditor({ strokeWidth }),
      setFontSize: (fontSize) => setEditor({ fontSize }),
      setZoom: (zoom) => setEditor({ zoom: Math.min(3, Math.max(0.25, zoom)) }),
      setCurrentPage: (currentPage) => setEditor({ currentPage, selectedId: null }),
      setSelectedId: (selectedId) => setEditor({ selectedId }),
      addAnnotation,
      updateAnnotation,
      deleteAnnotation,
      deleteSelected,
      undo: () => dispatchHistory({ type: 'UNDO' }),
      redo: () => dispatchHistory({ type: 'REDO' }),
      setTextEdit,
      clearTextEdits,
    }),
    [document, history, textEdits, editor, loadDocument, clearDocument, addAnnotation, updateAnnotation, deleteAnnotation, deleteSelected, setTextEdit, clearTextEdits],
  );

  return <PdfEditorContext.Provider value={value}>{children}</PdfEditorContext.Provider>;
}

export function usePdfEditor() {
  const ctx = useContext(PdfEditorContext);
  if (!ctx) throw new Error('usePdfEditor must be used within PdfEditorProvider');
  return ctx;
}
