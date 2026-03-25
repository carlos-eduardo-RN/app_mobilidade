type BarPoint = { label: string; value: number };

/** Gráfico de barras simples para comparação por período. */
export function SimpleBarChart({
  title,
  data,
}: {
  title: string;
  data: BarPoint[];
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <article className="card">
      <header>
        <h3>{title}</h3>
      </header>
      {data.length === 0 ? (
        <div className="empty">Sem dados no periodo.</div>
      ) : (
        <div className="bar-list">
          {data.map((item) => {
            const width = (item.value / max) * 100;
            return (
              <div key={item.label} className="bar-row">
                <span className="bar-label">{item.label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${width}%` }} />
                </div>
                <span className="bar-value">{item.value}</span>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
