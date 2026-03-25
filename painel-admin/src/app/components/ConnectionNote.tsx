export function ConnectionNote({ url }: { url: string }) {
  if (!url) {
    return (
      <div className="empty">
        URL em tempo real nao configurada. Defina VITE_REALTIME_URL.
      </div>
    );
  }
  return null;
}
