import { ButtonLink } from '@/components/ui/button';
export default function NotFound() {
  return (
    <main className="page-shell branded-state">
      <p className="eyebrow">Home Fashion · 404</p>
      <h1 className="font-serif text-5xl">Este espacio aún no existe</h1>
      <p>No encontramos la página que buscas. Descubre algo nuevo para tu hogar.</p>
      <div className="admin-actions">
        <ButtonLink href="/">Volver al inicio</ButtonLink>
        <ButtonLink href="/catalogo" variant="secondary">
          Explorar catálogo
        </ButtonLink>
      </div>
    </main>
  );
}
