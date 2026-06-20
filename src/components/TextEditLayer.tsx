import { useEffect, useRef, useState } from 'react';
import { usePdfTextContent, type PdfTextItem } from '../hooks/usePdfTextContent';
import { usePdfEditor } from '../context/PdfEditorContext';
import type { TextEdit } from '../types';

interface TextItemProps {
  item: PdfTextItem;
  pageIndex: number;
  screenX: number;
  screenY: number;
  screenW: number;
  screenH: number;
  screenFontSize: number;
  initialEdit: TextEdit | undefined;
  setTextEdit: (edit: TextEdit) => void;
}

/**
 * A single editable text region over a PDF text item.
 * Content is managed via a DOM ref — React never touches innerText after mount,
 * so the cursor/selection is never disrupted by re-renders.
 */
function TextItem({
  item,
  pageIndex,
  screenX,
  screenY,
  screenW,
  screenH,
  screenFontSize,
  initialEdit,
  setTextEdit,
}: TextItemProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isEdited, setIsEdited] = useState(false);

  // Set initial content exactly once on mount.
  // Empty dependency array is intentional — we must NOT re-run this or
  // React will overwrite the user's typed text.
  useEffect(() => {
    if (!divRef.current) return;
    const text = initialEdit ? initialEdit.newText : item.str;
    divRef.current.innerText = text;
    setIsEdited(!!initialEdit && initialEdit.newText !== item.str);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = () => {
    if (!divRef.current) return;
    const newText = divRef.current.innerText.replace(/\n$/, '');
    const edited = newText !== item.str;
    setIsEdited(edited);
    setTextEdit({
      key: `${pageIndex}::${item.index}`,
      pageIndex,
      itemIndex: item.index,
      originalText: item.str,
      newText,
      pdfX: item.pdfX,
      pdfY: item.pdfY - item.fontSize * 0.2,
      pdfWidth: item.width,
      pdfHeight: item.fontSize * 1.4,
      fontSize: item.fontSize,
      fontName: item.fontName,
      cssFontFamily: item.cssFontFamily,
      isBold: item.isBold,
      isItalic: item.isItalic,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') divRef.current?.blur();
  };

  return (
    <div
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      className={`text-edit-item${isEdited ? ' edited' : ''}`}
      style={{
        left: screenX,
        top: screenY,
        minWidth: Math.max(screenW, 20),
        minHeight: screenH,
        fontSize: screenFontSize,
        // Apply the actual font so editing experience matches the PDF
        fontFamily: item.cssFontFamily,
        fontWeight: item.isBold ? 'bold' : 'normal',
        fontStyle: item.isItalic ? 'italic' : 'normal',
        lineHeight: 1.2,
      }}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
    />
  );
}

interface LayerProps {
  pageIndex: number;
  /** CSS pixel dimensions of the rendered page canvas */
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Overlay layer that positions an editable div over every text item on the page,
 * allowing direct in-place editing of PDF text content.
 */
export function TextEditLayer({ pageIndex, canvasWidth, canvasHeight }: LayerProps) {
  const { document, editor, textEdits, setTextEdit } = usePdfEditor();
  const pdfBytes = document?.pdfBytes ?? null;
  const { items, loading } = usePdfTextContent(pdfBytes, pageIndex);

  if (!document || canvasWidth === 0 || canvasHeight === 0) return null;

  const zoom = editor.zoom;

  return (
    <div className="text-edit-layer" style={{ width: canvasWidth, height: canvasHeight }}>
      {loading && (
        <div className="text-edit-loading">Analyzing text…</div>
      )}

      {items.map((item) => {
        // PDF coords: bottom-left origin → screen coords: top-left origin
        const screenX = item.pdfX * zoom;
        const screenY = canvasHeight - item.pdfY * zoom - item.fontSize * zoom;
        const screenW = Math.max(item.width * zoom, 24);
        const screenH = Math.max(item.fontSize * zoom * 1.4, 12);
        const screenFontSize = item.fontSize * zoom;

        const key = `${pageIndex}::${item.index}`;
        const initialEdit = textEdits.find((e) => e.key === key);

        return (
          <TextItem
            key={key}
            item={item}
            pageIndex={pageIndex}
            screenX={screenX}
            screenY={screenY}
            screenW={screenW}
            screenH={screenH}
            screenFontSize={screenFontSize}
            initialEdit={initialEdit}
            setTextEdit={setTextEdit}
          />
        );
      })}
    </div>
  );
}
