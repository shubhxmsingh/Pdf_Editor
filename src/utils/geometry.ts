import type { Annotation, Point } from '../types';

export function generateId(): string {
  return crypto.randomUUID();
}

export function getAnnotationBounds(annotation: Annotation) {
  switch (annotation.type) {
    case 'text':
      return {
        x: annotation.x,
        y: annotation.y - annotation.fontSize,
        width: annotation.text.length * annotation.fontSize * 0.6,
        height: annotation.fontSize * 1.2,
      };
    case 'highlight':
    case 'rectangle':
    case 'ellipse':
      return {
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
      };
    case 'draw': {
      if (annotation.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
      const xs = annotation.points.map((p) => p.x);
      const ys = annotation.points.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(...xs) - minX,
        height: Math.max(...ys) - minY,
      };
    }
  }
}

export function pointInBounds(x: number, y: number, bounds: { x: number; y: number; width: number; height: number }) {
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
}

export function findAnnotationAtPoint(annotations: Annotation[], pageIndex: number, x: number, y: number) {
  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex);
  for (let i = pageAnnotations.length - 1; i >= 0; i--) {
    const bounds = getAnnotationBounds(pageAnnotations[i]);
    if (pointInBounds(x, y, bounds)) return pageAnnotations[i];
  }
  return null;
}

export function normalizeRect(start: Point, end: Point) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}
