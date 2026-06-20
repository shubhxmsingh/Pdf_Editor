import type { PDFDocumentProxy } from 'pdfjs-dist';

let _pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfJs() {
  if (!_pdfjsLib) {
    _pdfjsLib = await import('pdfjs-dist');
    _pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }
  return _pdfjsLib;
}

/**
 * Cache keyed by Uint8Array reference — prevents the ArrayBuffer from being
 * transferred (and thus detached) the second time a component calls loadPdfDocument.
 */
const docCache = new WeakMap<Uint8Array, Promise<PDFDocumentProxy>>();

export async function loadPdfDocument(pdfBytes: Uint8Array): Promise<PDFDocumentProxy> {
  if (docCache.has(pdfBytes)) return docCache.get(pdfBytes)!;

  const promise = (async () => {
    const pdfjsLib = await getPdfJs();
    const copy = pdfBytes.slice().buffer; // copy so our Uint8Array stays intact
    return pdfjsLib.getDocument({ data: copy }).promise;
  })();

  docCache.set(pdfBytes, promise);
  return promise;
}

/**
 * Render a PDF page to a canvas at the given zoom level.
 * Uses devicePixelRatio so the output is crisp on Retina / high-DPI displays.
 * Returns the CSS display dimensions (not the raw buffer size).
 */
export async function renderPageToCanvas(
  pdfDoc: PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  scale: number,
) {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const dpr = window.devicePixelRatio || 1;

  // Render at physical resolution for sharpness
  const viewport = page.getViewport({ scale: scale * dpr });
  const context = canvas.getContext('2d');
  if (!context) return { width: 0, height: 0 };

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // But display at CSS (logical) size
  const cssW = viewport.width / dpr;
  const cssH = viewport.height / dpr;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  await page.render({ canvas, canvasContext: context, viewport }).promise;

  // Return CSS dimensions — used by PageCanvas to size its wrapper div
  return { width: cssW, height: cssH };
}

export async function renderPageThumbnail(
  pdfDoc: PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  maxWidth = 120,
) {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const dpr = window.devicePixelRatio || 1;

  const viewport = page.getViewport({ scale: 1 });
  const scale = (maxWidth / viewport.width) * dpr;
  const scaledViewport = page.getViewport({ scale });
  const context = canvas.getContext('2d');
  if (!context) return;

  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;
  canvas.style.width = `${scaledViewport.width / dpr}px`;
  canvas.style.height = `${scaledViewport.height / dpr}px`;

  await page.render({ canvas, canvasContext: context, viewport: scaledViewport }).promise;
}
