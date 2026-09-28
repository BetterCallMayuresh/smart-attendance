export default function ConfidenceBadge({ level, score }) {
  const l = (level || 'LOW').toUpperCase();
  const cls =
    l === 'HIGH' ? 'badge-success' : l === 'MEDIUM' ? 'badge-warning' : 'badge-danger';
  return (
    <span className={`badge ${cls}`} title={score != null ? `Score ${score}/100` : undefined}>
      {l}
      {score != null ? ` ${score}` : ''}
    </span>
  );
}
