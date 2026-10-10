'use client';
import { Button, ButtonLink } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-shell branded-state">
      <p className="eyebrow">Home Fashion</p>
      <h1 className="font-serif text-4xl">No pudimos cargar esta sección</h1>
      <p>Puedes volver a intentarlo en un momento.</p>
      <div className="admin-actions">
        <Button onClick={reset}>Reintentar</Button>
        <ButtonLink href="/" variant="secondary">
          Volver al inicio
        </ButtonLink>
      </div>
    </main>
  );
}
