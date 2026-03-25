type Point = { label: string; value: number };

function buildPath(points: Point[], width: number, height: number) {
  if (points.length === 0) return '';
  const max = Math.max(...points.map((item) => item.value), 1);
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  return points
    .map((point, index) => {
      const x = index * stepX;
      const y = height - (point.value / max) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

/** Gráfico de linha simples em SVG sem dependência externa. */
export function SimpleLineChart({
  title,
  data,
}: {
  title: string;
  data: Point[];
}) {
  const width = 540;
  const height = 180;
  const path = buildPath(data, width, height);

  return (
    <article className="card">
      <header>
        <h3>{title}</h3>
      </header>
      {data.length === 0 ? (
        <div className="empty">Sem dados no periodo.</div>
      ) : (
        <div className="chart-wrap">
          <svg viewBox={`0 0 ${width} ${height + 30}`} className="chart-svg" role="img" aria-label={title}>
            <path d={path} fill="none" stroke="var(--accent)" strokeWidth="3" />
            {data.map((point, index) => {
              const max = Math.max(...data.map((item) => item.value), 1);
              const x = data.length > 1 ? (index * width) / (data.length - 1) : width / 2;
              const y = height - (point.value / max) * height;
              return <circle key={`${point.label}-${index}`} cx={x} cy={y} r="3" fill="var(--accent)" />;
            })}
            {data.map((point, index) => {
              const x = data.length > 1 ? (index * width) / (data.length - 1) : width / 2;
              return (
                <text key={`${point.label}-label-${index}`} x={x} y={height + 20} fontSize="10" fill="var(--muted)" textAnchor="middle">
                  {point.label}
                </text>
              );
            })}
          </svg>
        </div>
      )}
    </article>
  );
}
