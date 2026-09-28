export default function PercentRing({ value = 0, label = 'Attendance' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="percent-ring">
      <svg viewBox="0 0 100 100" width="120" height="120">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="54" textAnchor="middle" fill="#f1f5f9" fontSize="18" fontWeight="800">
          {pct}%
        </text>
      </svg>
      <span className="stat-label">{label}</span>
    </div>
  );
}
