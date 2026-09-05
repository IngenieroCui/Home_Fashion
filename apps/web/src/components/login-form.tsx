'use client';

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
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">Home Fashion</p>
        <h1 id="login-title" className="font-serif text-4xl text-[#3d291e]">
          Acceso al equipo de Home Fashion
        </h1>
        <p className="mt-3 text-[#67574d]">Ingresa con tu correo y contraseña de trabajo.</p>
        <form className="mt-8 grid gap-5" onSubmit={submit}>
          <label className="form-field">
            Correo electrónico
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label className="form-field">
            Contraseña
            <div className="password-field">
              <input
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
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button-link" disabled={loading} type="submit">
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
        <Link
          className="mt-6 inline-block text-sm font-semibold text-[#a64b32] underline underline-offset-4"
          href="/catalogo"
        >
          Volver al catálogo
        </Link>
      </section>
    </main>
  );
}
