import { useCallback, useEffect, useRef, useState } from 'react';
import { usePdfEditor } from '../context/PdfEditorContext';
import { loadPdfDocument, renderPageToCanvas } from '../utils/pdfLoader';
import { findAnnotationAtPoint, normalizeRect } from '../utils/geometry';
import { AnnotationLayer } from './AnnotationLayer';
import { TextEditLayer } from './TextEditLayer';
import type { Point } from '../types';

interface Props {
  pageIndex: number;
}

export function PageCanvas({ pageIndex }: Props) {
  const {
    document,
    annotations,
    editor,
    addAnnotation,
    updateAnnotation,
    setSelectedId,
  } = usePdfEditor();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [previewRect, setPreviewRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  useEffect(() => {
    if (!document || !canvasRef.current) return;

    let cancelled = false;

    (async () => {
      const pdfDoc = await loadPdfDocument(document.pdfBytes);
      if (cancelled || !canvasRef.current) return;
      const dims = await renderPageToCanvas(pdfDoc, pageIndex, canvasRef.current, editor.zoom);
      if (!cancelled) setDimensions(dims);
    })();

    return () => {
      cancelled = true;
    };
  }, [document, pageIndex, editor.zoom]);

  const getLocalPoint = useCallback((e: React.MouseEvent): Point => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!document) return;

    // In editText mode, let the contenteditable divs handle events
    if (editor.tool === 'editText') return;

    const point = getLocalPoint(e);

    if (editor.tool === 'pan') {
      const scrollParent = containerRef.current?.closest('.viewer-scroll');
      if (scrollParent) {
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: scrollParent.scrollLeft,
          scrollTop: scrollParent.scrollTop,
        };
      }
      return;
    }

    if (editor.tool === 'select') {
      const hit = findAnnotationAtPoint(annotations, pageIndex, point.x, point.y);
      setSelectedId(hit?.id ?? null);
      if (hit?.type === 'text') setEditingTextId(hit.id);
      return;
    }

    if (editor.tool === 'text') {
      const id = addAnnotation({
        type: 'text',
        pageIndex,
        x: point.x,
        y: point.y,
        text: '',
        fontSize: editor.fontSize,
        color: editor.color,
        scale: editor.zoom,
      });
      setEditingTextId(id);
      setSelectedId(id);
      return;
    }

    setIsDrawing(true);
    setDrawStart(point);

    if (editor.tool === 'draw') {
      setCurrentPoints([point]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (editor.tool === 'pan' && panStart.current) {
      const scrollParent = containerRef.current?.closest('.viewer-scroll');
      if (scrollParent) {
        scrollParent.scrollLeft = panStart.current.scrollLeft - (e.clientX - panStart.current.x);
        scrollParent.scrollTop = panStart.current.scrollTop - (e.clientY - panStart.current.y);
      }
      return;
    }

    if (!isDrawing || !drawStart) return;
    const point = getLocalPoint(e);

    if (editor.tool === 'draw') {
      setCurrentPoints((prev) => [...prev, point]);
    } else if (editor.tool === 'highlight' || editor.tool === 'rectangle' || editor.tool === 'ellipse') {
      setPreviewRect(normalizeRect(drawStart, point));
    }
  };

  const handleMouseUp = () => {
    panStart.current = null;
    if (!isDrawing || !drawStart) return;

    if (editor.tool === 'draw' && currentPoints.length > 1) {
      addAnnotation({
        type: 'draw',
        pageIndex,
        points: currentPoints,
        color: editor.color,
        strokeWidth: editor.strokeWidth,
        scale: editor.zoom,
      });
    } else if (previewRect && previewRect.width > 3 && previewRect.height > 3) {
      if (editor.tool === 'highlight') {
        addAnnotation({
          type: 'highlight',
          pageIndex,
          ...previewRect,
          color: editor.color === '#2563eb' ? '#facc15' : editor.color,
          scale: editor.zoom,
        });
      } else if (editor.tool === 'rectangle' || editor.tool === 'ellipse') {
        addAnnotation({
          type: editor.tool,
          pageIndex,
          ...previewRect,
          color: editor.color,
          strokeWidth: editor.strokeWidth,
          scale: editor.zoom,
        });
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentPoints([]);
    setPreviewRect(null);
  };

  const cursorClass =
    editor.tool === 'pan'
      ? 'cursor-grab'
      : editor.tool === 'select'
        ? 'cursor-default'
        : editor.tool === 'editText'
          ? 'cursor-text'
          : 'cursor-crosshair';

  return (
    <div
      ref={containerRef}
      className={`page-canvas ${cursorClass}`}
      style={{ width: dimensions.width, height: dimensions.height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas ref={canvasRef} className="pdf-canvas" />

      {/* Overlay annotations (text boxes, shapes, highlights, drawings) */}
      <AnnotationLayer
        annotations={annotations}
        pageIndex={pageIndex}
        selectedId={editor.selectedId}
        editingTextId={editingTextId}
        onTextChange={(id, text) => updateAnnotation(id, { text } as Partial<(typeof annotations)[0]>)}
        onTextEditEnd={() => setEditingTextId(null)}
      />

      {/* Direct PDF text editing overlay — only shown in editText mode */}
      {editor.tool === 'editText' && dimensions.width > 0 && (
        <TextEditLayer
          pageIndex={pageIndex}
          canvasWidth={dimensions.width}
          canvasHeight={dimensions.height}
        />
      )}

      {previewRect && (
        <svg className="annotation-layer preview">
          {editor.tool === 'highlight' && (
            <rect
              x={previewRect.x}
              y={previewRect.y}
              width={previewRect.width}
              height={previewRect.height}
              fill={editor.color === '#2563eb' ? '#facc15' : editor.color}
              fillOpacity={0.35}
            />
          )}
          {editor.tool === 'rectangle' && (
            <rect
              x={previewRect.x}
              y={previewRect.y}
              width={previewRect.width}
              height={previewRect.height}
              fill="none"
              stroke={editor.color}
              strokeWidth={editor.strokeWidth}
              strokeDasharray="4 2"
            />
          )}
          {editor.tool === 'ellipse' && (
            <ellipse
              cx={previewRect.x + previewRect.width / 2}
              cy={previewRect.y + previewRect.height / 2}
              rx={previewRect.width / 2}
              ry={previewRect.height / 2}
              fill="none"
              stroke={editor.color}
              strokeWidth={editor.strokeWidth}
              strokeDasharray="4 2"
            />
          )}
        </svg>
      )}
      {isDrawing && editor.tool === 'draw' && currentPoints.length > 1 && (
        <svg className="annotation-layer preview">
          <path
            d={currentPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
            fill="none"
            stroke={editor.color}
            strokeWidth={editor.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}
