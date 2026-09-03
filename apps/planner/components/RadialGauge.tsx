"use client";

interface RadialGaugeProps {
  value: number;
  max?: number;
  label: string;
  sublabel?: string;
  /** "urgent" | "warn" | "ok" | "teal" — controls ring + number color */
  variant?: "urgent" | "warn" | "ok" | "teal" | "neutral";
  size?: number;
}

const VARIANTS = {
  urgent: { stroke: "#e84545", glow: "rgba(232,69,69,0.4)", text: "#e84545" },
  warn:   { stroke: "#e0b03c", glow: "rgba(224,176,60,0.35)", text: "#e0b03c" },
  ok:     { stroke: "#3cc68a", glow: "rgba(60,198,138,0.35)", text: "#3cc68a" },
  teal:   { stroke: "#12a888", glow: "rgba(18,168,136,0.35)", text: "#12a888" },
  neutral:{ stroke: "#263a55", glow: "transparent",           text: "#b7c4be" },
};

export default function RadialGauge({
  value,
  max = 99,
  label,
  sublabel,
  variant = "teal",
  size = 88,
}: RadialGaugeProps) {
  const colors = VARIANTS[variant];
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillRatio = max > 0 ? Math.min(value / max, 1) : 0;
  const dashOffset = circumference * (1 - fillRatio);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="radial-gauge" style={{ width: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        {/* Glow filter */}
        <defs>
          <filter id={`glow-${label.replace(/\s/g, "")}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track ring */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth="5"
        />

        {/* Fill ring */}
        {fillRatio > 0 && (
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{
              filter: `drop-shadow(0 0 5px ${colors.glow})`,
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        )}

        {/* Value text */}
        <text
          x={cx} y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={colors.text}
          fontSize={size * 0.26}
          fontFamily="Fraunces, Georgia, serif"
          fontWeight="500"
        >
          {value > 999 ? "999+" : value}
        </text>
      </svg>
      <div className="radial-gauge-label">{label}</div>
      {sublabel && <div className="radial-gauge-sublabel">{sublabel}</div>}
    </div>
  );
}
