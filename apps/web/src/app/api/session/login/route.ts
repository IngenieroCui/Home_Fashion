import { NextResponse } from 'next/server';
import { clearSessionCookies, setSessionCookies } from '@/lib/auth/cookies';
import { loginWithApi, logoutWithApi } from '@/lib/auth/server';

const invalidCredentials = () =>
  NextResponse.json({ message: 'No fue posible iniciar sesión con esos datos.' }, { status: 401 });

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; password?: unknown };
  } catch {
    return invalidCredentials();
  }
  if (
    typeof body.email !== 'string' ||
    typeof body.password !== 'string' ||
    !body.email.includes('@') ||
    body.password.length < 8
  )
    return invalidCredentials();

  const result = await loginWithApi(body.email, body.password);
  if (!result.data && result.status === 429)
    return NextResponse.json({ message: 'Demasiados intentos. Espera un momento y vuelve a intentarlo.' }, {
      status: 429, ...(result.retryAfter ? { headers: { 'retry-after': result.retryAfter } } : {})
    });
  if (!result.data)
    return result.status === 0 || result.status >= 500
      ? NextResponse.json(
          { message: 'El servicio de acceso no está disponible. Inténtalo más tarde.' },
          { status: 503 }
        )
      : invalidCredentials();
  if (result.data.user.role === 'WORKSHOP') {
    await logoutWithApi(result.data.refreshToken);
    const response = NextResponse.json(
      {
        message: 'Las cuentas de taller ingresan desde la aplicación móvil Home Fashion Talleres.'
      },
      { status: 403 }
    );
    clearSessionCookies(response);
    return response;
  }

  try {
    const response = NextResponse.json({ user: result.data.user });
    setSessionCookies(response, result.data.accessToken, result.data.refreshToken);
    return response;
  } catch {
    return NextResponse.json(
      { message: 'No fue posible iniciar sesión. Inténtalo más tarde.' },
      { status: 502 }
    );
  }
}
