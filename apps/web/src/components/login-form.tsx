'use client';

import { Button } from './ui/button';
import { FormField } from './ui/form-field';
import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function LoginForm({ unavailable = false }: { unavailable?: boolean }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    unavailable
      ? 'El servicio de acceso no está disponible en este momento. Tu sesión se conserva; vuelve a intentarlo en unos minutos.'
      : ''
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await clientFetch('/api/session/login', {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: String(form.get('email') ?? '').trim(),
          password: form.get('password')
        })
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? 'No fue posible iniciar sesión.');
        return;
      }
      router.replace('/panel');
      router.refresh();
    } catch {
      setError('No fue posible iniciar sesión. Inténtalo más tarde.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="login-page">
      <aside className="login-editorial" aria-label="Bienvenido al espacio de trabajo">
        <div>
          <p className="eyebrow">Home Fashion · Equipo</p>
          <h2 className="font-serif">Cada detalle, desde la idea hasta la entrega.</h2>
          <p>
            Un espacio para acompañar a cada cliente, coordinar pedidos y cuidar el trabajo de
            nuestros talleres.
          </p>
        </div>
        <span>01 — Atención &nbsp; / &nbsp; 02 — Producción &nbsp; / &nbsp; 03 — Entrega</span>
      </aside>
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">Home Fashion</p>
        <h1 id="login-title" className="font-serif text-4xl text-[var(--color-text)]">
          Acceso al equipo de Home Fashion
        </h1>
        <p className="mt-3 text-[var(--color-text-muted)]">
          Ingresa con tu correo y contraseña de trabajo.
        </p>
        <form className="mt-8 grid gap-5" onSubmit={submit}>
          <FormField label="Correo electrónico" required>
            <input className="form-field-input" autoComplete="username" name="email" type="email" />
          </FormField>
          <div className="form-field">
            <label htmlFor="login-password">Contraseña (obligatorio)</label>
            <div className="password-field">
              <input
                id="login-password"
                autoComplete="current-password"
                name="password"
                required
                minLength={8}
                type={showPassword ? 'text' : 'password'}
              />
              <button
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="text-button"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button loading={loading} type="submit">
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
        </form>
        <Link
          className="mt-6 inline-block text-sm font-semibold text-[var(--color-primary)] underline underline-offset-4"
          href="/catalogo"
        >
          Volver al catálogo
        </Link>
      </section>
    </main>
  );
}
