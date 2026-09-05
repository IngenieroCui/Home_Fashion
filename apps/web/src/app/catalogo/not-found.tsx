import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="page-shell py-20">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-serif text-5xl text-[#3d291e]">Producto no encontrado</h1>
      <p className="mt-4 text-[#67574d]">
        Puede que ya no esté disponible o que el enlace sea incorrecto.
      </p>
      <Link className="button-link mt-8" href="/catalogo">
        Volver al catálogo
      </Link>
    </main>
  );
}
