export function heatmapMax(days) {
  return Math.max(1, ...days.map((d) => d.count || 0));
}

export function attendancePercent(attended, totalSessions) {
  const total = Math.max(1, Number(totalSessions) || 0);
  return Math.min(100, Math.round((Number(attended) * 100) / total));
}
