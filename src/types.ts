export type Tool = 'select' | 'pan' | 'text' | 'highlight' | 'draw' | 'rectangle' | 'ellipse' | 'editText';

export interface Point {
  x: number;
  y: number;
}

interface BaseAnnotation {
  id: string;
  pageIndex: number;
  /** The zoom level at the time this annotation was created (used for coordinate normalization on export). */
  scale: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface DrawAnnotation extends BaseAnnotation {
  type: 'draw';
  points: Point[];
  color: string;
  strokeWidth: number;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'rectangle' | 'ellipse';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  fill?: string;
}

export type AnnotationInput =
  | Omit<TextAnnotation, 'id'>
  | Omit<HighlightAnnotation, 'id'>
  | Omit<DrawAnnotation, 'id'>
  | Omit<ShapeAnnotation, 'id'>;

export type Annotation =
  | TextAnnotation
  | HighlightAnnotation
  | DrawAnnotation
  | ShapeAnnotation;

export interface EditorState {
  tool: Tool;
  color: string;
  strokeWidth: number;
  fontSize: number;
  zoom: number;
  currentPage: number;
  selectedId: string | null;
}

export interface PdfDocument {
  file: File;
  name: string;
  pageCount: number;
  pdfBytes: Uint8Array;
}

/** Represents a direct edit to existing PDF text content */
export interface TextEdit {
  /** Unique key: `${pageIndex}::${itemIndex}` */
  key: string;
  pageIndex: number;
  /** Index of the text item within the page's text content */
  itemIndex: number;
  originalText: string;
  newText: string;
  /** PDF coordinate space (bottom-left origin, at scale=1) */
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;
  fontSize: number;
  fontName: string;
  /** CSS font-family string resolved from the PDF font (e.g. '"Times New Roman", serif') */
  cssFontFamily: string;
  isBold: boolean;
  isItalic: boolean;
}
