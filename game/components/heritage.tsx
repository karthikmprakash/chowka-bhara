import type { CSSProperties } from "react";
export function Kolam({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`kolam ${className}`}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path
          d="M60 9C93 9 111 27 111 60S93 111 60 111 9 93 9 60 27 9 60 9Z"
          strokeDasharray="1 7"
        />
        <path d="M60 23C85 3 117 35 91 60 117 85 85 117 60 91 35 117 3 85 29 60 3 35 35 3 60 23Z" />
        <path d="M60 37C78 19 101 42 83 60 101 78 78 101 60 83 42 101 19 78 37 60 19 42 42 19 60 37Z" />
        <path d="M60 44 76 60 60 76 44 60Z" />
      </g>
      {[
        [60, 14],
        [14, 60],
        [106, 60],
        [60, 106],
        [60, 60],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.5" fill="currentColor" />
      ))}
    </svg>
  );
}
export function Petals() {
  return (
    <div className="celebration-petals" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <i
          key={i}
          style={
            {
              "--petal-angle": `${i * 30}deg`,
              "--petal-delay": `${(i % 3) * 40}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
