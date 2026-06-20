import { useEffect, useState } from 'react';

export interface PdfTextItem {
  index: number;
  str: string;
  /** Transform matrix [scaleX, skewX, skewY, scaleY, translateX, translateY] */
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  /** Resolved font size in PDF points */
  fontSize: number;
  /** Bottom-left X in PDF coords */
  pdfX: number;
  /** Bottom-left Y in PDF coords */
  pdfY: number;
  /** CSS font-family string resolved by pdfjs (e.g. '"Times New Roman", serif') */
  cssFontFamily: string;
  isBold: boolean;
  isItalic: boolean;
}

// ── Font helpers ─────────────────────────────────────────────────────────────

/**
 * Parse bold/italic from the raw PDF font name.
 * PDF font names often look like "ABCDEF+TimesNewRoman-BoldItalic" or "Helvetica-Bold".
 */
function parseFontStyle(rawFontName: string, resolvedFamily: string) {
  // Strip the PDF embedded-subset prefix (e.g. "ABCDEF+")
  const name = rawFontName.replace(/^[A-Z]{6}\+/, '').toLowerCase();
  const family = resolvedFamily.toLowerCase();

  const isBold =
    name.includes('bold') || name.includes('-bd') || name.includes('heavy') ||
    name.includes('black') || name.includes('demi') ||
    family.includes('bold') || family.includes('heavy');

  const isItalic =
    name.includes('italic') || name.includes('oblique') || name.includes('-it') ||
    name.includes('-sl') || name.includes('inclined') ||
    family.includes('italic') || family.includes('oblique');

  return { isBold, isItalic };
}

/**
 * Convert pdfjs's resolved font-family string to a safe CSS font-family stack.
 * pdfjs often returns just the base name (e.g. "Times New Roman"); we augment it.
 */
function buildCssFontFamily(resolved: string): string {
  const lower = resolved.toLowerCase();

  if (lower.includes('courier') || lower.includes('mono') || lower.includes('consol')) {
    return '"Courier New", Courier, monospace';
  }
  if (
    lower.includes('times') || lower.includes('georgia') ||
    (lower.includes('serif') && !lower.includes('sans'))
  ) {
    return `"${resolved}", "Times New Roman", Times, Georgia, serif`;
  }
  if (lower.includes('arial')) {
    return `"${resolved}", Arial, Helvetica, sans-serif`;
  }
  if (lower.includes('calibri') || lower.includes('carlito')) {
    return `"${resolved}", Calibri, Arial, Helvetica, sans-serif`;
  }
  if (lower.includes('verdana')) {
    return `"${resolved}", Verdana, Arial, sans-serif`;
  }
  if (lower.includes('garamond') || lower.includes('palatino') || lower.includes('book antiqua')) {
    return `"${resolved}", Georgia, serif`;
  }
  // Generic sans-serif fallback
  return `"${resolved}", Helvetica, Arial, sans-serif`;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Extracts text items for the given page from a pdfjs document.
 * Items are in PDF coordinate space (bottom-left origin, unscaled).
 * Font family and bold/italic are resolved via pdfjs's styles map.
 */
export function usePdfTextContent(
  pdfBytes: Uint8Array | null,
  pageIndex: number,
): { items: PdfTextItem[]; loading: boolean; error: string | null } {
  const [items, setItems] = useState<PdfTextItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfBytes) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();

        const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice().buffer }).promise;
        const page = await pdfDoc.getPage(pageIndex + 1);

        // pdfjs returns both items and a styles map (fontName → TextStyle)
        const content = await page.getTextContent({ includeMarkedContent: false } as never);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const styles: Record<string, { fontFamily?: string }> = (content as any).styles ?? {};

        if (cancelled) return;

        let idx = 0;
        const parsed: PdfTextItem[] = [];

        for (const rawItem of content.items) {
          // TextMarkedContent items don't have 'str'
          if (!('str' in rawItem)) continue;
          const item = rawItem as import('pdfjs-dist/types/src/display/api').TextItem;
          if (!item.str.trim()) continue;

          const [scaleX, , , scaleY, tx, ty] = item.transform;
          const fontSize = Math.abs(scaleY) || Math.abs(scaleX) || 12;

          // Look up the font family from pdfjs styles
          const styleEntry = styles[item.fontName];
          const resolvedFamily = styleEntry?.fontFamily ?? 'Helvetica';
          const cssFontFamily = buildCssFontFamily(resolvedFamily);
          const { isBold, isItalic } = parseFontStyle(item.fontName, resolvedFamily);

          parsed.push({
            index: idx++,
            str: item.str,
            transform: item.transform,
            width: item.width,
            height: item.height,
            fontName: item.fontName,
            fontSize,
            pdfX: tx,
            pdfY: ty,
            cssFontFamily,
            isBold,
            isItalic,
          });
        }

        setItems(parsed);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfBytes, pageIndex]);

  return { items, loading, error };
}
