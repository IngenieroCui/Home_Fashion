export function EvidenceLinks({ urls }: { urls: string[] | null | undefined }) {
  if (!urls?.length) return null;
  return (
    <section className="admin-section">
      <h2 className="font-serif text-2xl">Evidencias</h2>
      <div className="admin-actions">
        {urls.map((url, index) => (
          <a
            className="text-link"
            href={url}
            key={`${url}-${index}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            Abrir evidencia {index + 1}
          </a>
        ))}
      </div>
    </section>
  );
}
