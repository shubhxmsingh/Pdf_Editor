import type { Annotation, DrawAnnotation, HighlightAnnotation, ShapeAnnotation, TextAnnotation } from '../types';

interface Props {
  annotations: Annotation[];
  pageIndex: number;
  selectedId: string | null;
  editingTextId: string | null;
  onTextChange: (id: string, text: string) => void;
  onTextEditEnd: () => void;
}

function DrawPath({ annotation }: { annotation: DrawAnnotation }) {
  if (annotation.points.length < 2) return null;
  const d = annotation.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  return (
    <path
      d={d}
      fill="none"
      stroke={annotation.color}
      strokeWidth={annotation.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function AnnotationLayer({
  annotations,
  pageIndex,
  selectedId,
  editingTextId,
  onTextChange,
  onTextEditEnd,
}: Props) {
  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex);

  return (
    <svg className="annotation-layer">
      {pageAnnotations.map((annotation) => {
        const isSelected = annotation.id === selectedId;

        switch (annotation.type) {
          case 'highlight': {
            const a = annotation as HighlightAnnotation;
            return (
              <rect
                key={a.id}
                x={a.x}
                y={a.y}
                width={a.width}
                height={a.height}
                fill={a.color}
                fillOpacity={0.35}
                stroke={isSelected ? '#2563eb' : 'none'}
                strokeWidth={isSelected ? 2 : 0}
                strokeDasharray={isSelected ? '4 2' : undefined}
              />
            );
          }
          case 'draw':
            return (
              <g key={annotation.id}>
                <DrawPath annotation={annotation as DrawAnnotation} />
                {isSelected && (
                  <DrawPath
                    annotation={{
                      ...(annotation as DrawAnnotation),
                      color: '#2563eb',
                      strokeWidth: (annotation as DrawAnnotation).strokeWidth + 2,
                    }}
                  />
                )}
              </g>
            );
          case 'rectangle': {
            const a = annotation as ShapeAnnotation;
            return (
              <rect
                key={a.id}
                x={a.x}
                y={a.y}
                width={a.width}
                height={a.height}
                fill={a.fill ?? 'none'}
                fillOpacity={a.fill ? 0.2 : 0}
                stroke={isSelected ? '#2563eb' : a.color}
                strokeWidth={isSelected ? a.strokeWidth + 1 : a.strokeWidth}
                strokeDasharray={isSelected ? '4 2' : undefined}
              />
            );
          }
          case 'ellipse': {
            const a = annotation as ShapeAnnotation;
            return (
              <ellipse
                key={a.id}
                cx={a.x + a.width / 2}
                cy={a.y + a.height / 2}
                rx={a.width / 2}
                ry={a.height / 2}
                fill={a.fill ?? 'none'}
                fillOpacity={a.fill ? 0.2 : 0}
                stroke={isSelected ? '#2563eb' : a.color}
                strokeWidth={isSelected ? a.strokeWidth + 1 : a.strokeWidth}
                strokeDasharray={isSelected ? '4 2' : undefined}
              />
            );
          }
          case 'text': {
            const a = annotation as TextAnnotation;
            if (editingTextId === a.id) {
              return (
                <foreignObject key={a.id} x={a.x} y={a.y - a.fontSize} width={300} height={a.fontSize * 2}>
                  <input
                    className="text-edit-input"
                    autoFocus
                    value={a.text}
                    style={{ fontSize: a.fontSize, color: a.color }}
                    onChange={(e) => onTextChange(a.id, e.target.value)}
                    onBlur={onTextEditEnd}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') onTextEditEnd();
                    }}
                  />
                </foreignObject>
              );
            }
            return (
              <text
                key={a.id}
                x={a.x}
                y={a.y}
                fill={a.color}
                fontSize={a.fontSize}
                fontFamily="Helvetica, Arial, sans-serif"
                stroke={isSelected ? '#2563eb' : 'none'}
                strokeWidth={isSelected ? 0.5 : 0}
              >
                {a.text}
              </text>
            );
          }
          default:
            return null;
        }
      })}
    </svg>
  );
}
