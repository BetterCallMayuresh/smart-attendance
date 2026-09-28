export default function AttendanceHeatmap({ days = [] }) {
  if (!days.length) {
    return <p className="text-muted">No heatmap data yet.</p>;
  }

  const max = Math.max(1, ...days.map((d) => d.count || 0));

  return (
    <div className="heatmap" role="img" aria-label="Attendance heatmap">
      {days.map((d) => {
        const intensity = (d.count || 0) / max;
        const bg =
          d.count === 0
            ? 'rgba(148, 163, 184, 0.12)'
            : `rgba(16, 185, 129, ${0.2 + intensity * 0.8})`;
        return (
          <span
            key={d.date}
            className="heatmap-cell"
            style={{ background: bg }}
            title={`${d.date}: ${d.count} class${d.count === 1 ? '' : 'es'}`}
          />
        );
      })}
    </div>
  );
}
