interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = '#f59e0b', height = 48 }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const width = 120;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height * 0.85 - height * 0.075,
  }));

  // Cubic bezier path
  const path = points.reduce((d, pt, i) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + pt.x) / 2;
    return `${d} C ${cpx},${prev.y} ${cpx},${pt.y} ${pt.x},${pt.y}`;
  }, '');

  const areaPath = `${path} L ${points[points.length - 1].x},${height} L 0,${height} Z`;
  const gradientId = `spark-${color.replace('#', '')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="absolute bottom-0 right-0 opacity-30 pointer-events-none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
