interface Props {
  ratio: number; // 0..1
  size?: number;
  stroke?: number;
  label: string;
}

/**
 * حلقة إنجاز SVG.
 * مهم: لا نعتمد على اللون وحده — الحلقة مصحوبة دائمًا بنص عددي داخلها،
 * ونسبة الإنجاز متاحة لقارئ الشاشة عبر `aria`.
 */
export default function ProgressRing({ ratio, size = 64, stroke = 6, label }: Props) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped);
  const percent = Math.round(clamped * 100);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="img"
      aria-label={`${label}: ${percent}%`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} aria-hidden focusable="false">
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span
        className="absolute font-bold tabular-nums"
        style={{ fontSize: size * 0.26, color: "var(--text)" }}
        aria-hidden
      >
        {percent}%
      </span>
    </div>
  );
}
