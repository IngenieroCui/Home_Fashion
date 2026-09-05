export default function Loading() {
  return (
    <main className="page-shell py-12">
      <p className="eyebrow">Catálogo</p>
      <div className="mt-5 h-12 w-72 animate-pulse rounded bg-[#e8ded0]" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div className="h-80 animate-pulse rounded-2xl bg-[#e8ded0]" key={item} />
        ))}
      </div>
    </main>
  );
}
