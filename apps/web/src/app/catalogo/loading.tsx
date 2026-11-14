export default function Loading() {
  return (
    <main className="page-shell py-12">
      <p className="eyebrow">Catálogo</p>
      <div className="mt-5 h-12 w-72 animate-pulse rounded bg-[var(--color-surface-strong)]" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div className="h-80 animate-pulse rounded-2xl bg-[var(--color-surface-strong)]" key={item} />
        ))}
      </div>
    </main>
  );
}
