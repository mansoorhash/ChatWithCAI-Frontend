export default function SpinnerRounded({
    size = 48,             // diameter
    thickness = 6,         // stroke width
    color = "rgba(139, 139, 139, 1)",     // head color
    trailColor = "rgba(228, 215, 215, 0)", // base ring
    speed = 1,             // seconds per rotation
    arcLength = 0.65       // fraction of circle (0.25 = 25%)
    }) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * arcLength;
  const gap = circumference - dash;
  const gradientId = `grad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        animation: `spin ${speed}s linear infinite`,
        transformOrigin: "50% 50%",
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Base ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trailColor}
        strokeWidth={thickness}
        fill="none"
      />

      {/* Arc with gradient */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={`url(#${gradientId})`}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset="0"
        fill="none"
      />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}
