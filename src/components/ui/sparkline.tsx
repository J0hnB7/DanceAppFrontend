"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  filled?: boolean;
}

export function Sparkline({
  data,
  width = 200,
  height = 40,
  color = "var(--accent)",
  filled = true,
}: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const step = width / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * step,
    y: height - (v / max) * (height - 4) - 2,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${points[0].x},${height} ${polyline} ${points[points.length - 1].x},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
    >
      {filled && (
        <polygon points={area} fill={color} fillOpacity={0.12} />
      )}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
