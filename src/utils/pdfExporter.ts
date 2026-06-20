import { PDFDocument, rgb, StandardFonts, type PDFFont } from 'pdf-lib';
import type { Annotation, DrawAnnotation, HighlightAnnotation, ShapeAnnotation, TextAnnotation, TextEdit } from '../types';

// ── Color helpers ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return rgb(0, 0, 0);
  return rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  );
}

// ── Font mapping ──────────────────────────────────────────────────────────────

/**
 * Pick the closest pdf-lib StandardFont based on the resolved CSS font-family
 * and bold/italic flags extracted from the original PDF font.
 */
function getStandardFont(cssFontFamily: string, isBold: boolean, isItalic: boolean): StandardFonts {
  const lower = cssFontFamily.toLowerCase();

  // Monospace / Courier
  if (lower.includes('courier') || lower.includes('mono') || lower.includes('consol')) {
    if (isBold && isItalic) return StandardFonts.CourierBoldOblique;
    if (isBold) return StandardFonts.CourierBold;
    if (isItalic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }

  // Serif (Times, Georgia, Garamond, etc.)
  if (
    lower.includes('times') || lower.includes('georgia') || lower.includes('garamond') ||
    lower.includes('palatino') || lower.includes('book antiqua') ||
    (lower.includes('serif') && !lower.includes('sans'))
  ) {
    if (isBold && isItalic) return StandardFonts.TimesRomanBoldItalic;
    if (isBold) return StandardFonts.TimesRomanBold;
    if (isItalic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }

  // Default: Helvetica (covers Arial, Calibri, Verdana, generic sans-serif)
  if (isBold && isItalic) return StandardFonts.HelveticaBoldOblique;
  if (isBold) return StandardFonts.HelveticaBold;
  if (isItalic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportPdfWithAnnotations(
  pdfBytes: Uint8Array,
  annotations: Annotation[],
  textEdits: TextEdit[] = [],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  // Pre-embed every standard font variant that is actually needed (lazy map)
  const fontCache = new Map<StandardFonts, PDFFont>();

  async function getFont(sf: StandardFonts): Promise<PDFFont> {
    if (!fontCache.has(sf)) {
      fontCache.set(sf, await pdfDoc.embedFont(sf));
    }
    return fontCache.get(sf)!;
  }

  // ── Apply direct text edits ─────────────────────────────────────────────────
  for (const edit of textEdits) {
    if (edit.newText === edit.originalText) continue;
    const page = pages[edit.pageIndex];
    if (!page) continue;

    // 1. White-rect over the original text
    page.drawRectangle({
      x: edit.pdfX - 1,
      y: edit.pdfY - edit.fontSize * 0.15,
      width: edit.pdfWidth + 4,
      height: edit.pdfHeight + edit.fontSize * 0.15,
      color: rgb(1, 1, 1),
      opacity: 1,
      borderWidth: 0,
    });

    // 2. Draw replacement text with the closest matching standard font
    if (edit.newText.trim()) {
      const sf = getStandardFont(edit.cssFontFamily ?? '', edit.isBold ?? false, edit.isItalic ?? false);
      const font = await getFont(sf);
      const clampedSize = Math.min(Math.max(edit.fontSize, 4), 144);

      page.drawText(edit.newText, {
        x: edit.pdfX,
        y: edit.pdfY,
        size: clampedSize,
        font,
        color: rgb(0, 0, 0),
      });
    }
  }

  // ── Apply overlay annotations ────────────────────────────────────────────────
  // Default font for add-text annotations (always Helvetica)
  const defaultFont = await getFont(StandardFonts.Helvetica);

  for (const annotation of annotations) {
    const page = pages[annotation.pageIndex];
    if (!page) continue;

    const { width: pageWidth, height: pageHeight } = page.getSize();
    const s = annotation.scale ?? 1;

    switch (annotation.type) {
      case 'text': {
        const a = annotation as TextAnnotation;
        page.drawText(a.text, {
          x: a.x / s,
          y: pageHeight - a.y / s - a.fontSize / s,
          size: a.fontSize / s,
          font: defaultFont,
          color: hexToRgb(a.color),
        });
        break;
      }
      case 'highlight': {
        const a = annotation as HighlightAnnotation;
        page.drawRectangle({
          x: a.x / s,
          y: pageHeight - a.y / s - a.height / s,
          width: a.width / s,
          height: a.height / s,
          color: hexToRgb(a.color),
          opacity: 0.35,
          borderWidth: 0,
        });
        break;
      }
      case 'draw': {
        const a = annotation as DrawAnnotation;
        for (let i = 1; i < a.points.length; i++) {
          const p0 = a.points[i - 1];
          const p1 = a.points[i];
          page.drawLine({
            start: { x: p0.x / s, y: pageHeight - p0.y / s },
            end: { x: p1.x / s, y: pageHeight - p1.y / s },
            thickness: a.strokeWidth / s,
            color: hexToRgb(a.color),
          });
        }
        break;
      }
      case 'rectangle':
      case 'ellipse': {
        const a = annotation as ShapeAnnotation;
        const x = a.x / s;
        const w = a.width / s;
        const h = a.height / s;
        const y = pageHeight - a.y / s - h;
        if (a.type === 'rectangle') {
          page.drawRectangle({
            x, y, width: w, height: h,
            borderColor: hexToRgb(a.color),
            borderWidth: a.strokeWidth / s,
            color: a.fill ? hexToRgb(a.fill) : undefined,
            opacity: a.fill ? 0.2 : undefined,
          });
        } else {
          page.drawEllipse({
            x: x + w / 2,
            y: y + h / 2,
            xScale: w / 2,
            yScale: h / 2,
            borderColor: hexToRgb(a.color),
            borderWidth: a.strokeWidth / s,
            color: a.fill ? hexToRgb(a.fill) : undefined,
            opacity: a.fill ? 0.2 : undefined,
          });
        }
        break;
      }
    }

    void pageWidth;
  }

  return pdfDoc.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
