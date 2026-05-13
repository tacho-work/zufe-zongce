import './SkeletonBlock.css';

interface SkeletonBlockProps {
  lines?: number;
  height?: string;
}

export function SkeletonBlock({ lines = 3, height }: SkeletonBlockProps) {
  return (
    <div className="skeleton-block" style={height ? { height } : undefined}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{ width: `${100 - i * 12 - Math.random() * 8}%` }}
        />
      ))}
    </div>
  );
}
