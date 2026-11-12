import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="page-shell py-20">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-serif text-5xl text-[var(--color-text)]">Producto no encontrado</h1>
      <p className="mt-4 text-[var(--color-text-muted)]">
        Puede que ya no esté disponible o que el enlace sea incorrecto.
      </p>
      <Link className="button-link mt-8" href="/catalogo">
        Volver al catálogo
      </Link>
    </main>
  );
}
