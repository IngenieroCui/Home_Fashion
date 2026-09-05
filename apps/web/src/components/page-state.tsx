import Link from 'next/link';

export function PageState({
  title,
  children,
  action,
  tone = 'empty'
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  tone?: 'empty' | 'error' | 'loading';
}) {
  return (
    <section
      className={`page-state page-state-${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-busy={tone === 'loading'}
    >
      <span className="page-state-symbol" aria-hidden="true">
        {tone === 'error' ? '!' : tone === 'loading' ? '…' : '◇'}
      </span>
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="page-state-description">{children}</div>
      {action ? <div className="admin-actions">{action}</div> : null}
    </section>
  );
}

export function ListError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <PageState
      title="No pudimos cargar la información"
      tone="error"
      action={
        <>
          <button className="button-link" type="button" onClick={retry}>
            Volver a intentar
          </button>
          {message.includes('sesión') && (
            <Link className="button-link button-link-secondary" href="/iniciar-sesion">
              Iniciar sesión
            </Link>
          )}
        </>
      }
    >
      <p>{message}</p>
    </PageState>
  );
}
