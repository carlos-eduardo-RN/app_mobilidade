export function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <article className="card kpi">
      <span className="kpi-label">{title}</span>
      <strong className="kpi-value">{value}</strong>
      {subtitle ? <span className="muted">{subtitle}</span> : null}
    </article>
  );
}
