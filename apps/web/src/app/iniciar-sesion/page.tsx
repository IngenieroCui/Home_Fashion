import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { getAuthenticatedUser, sessionTokens } from '@/lib/auth/server';
export const dynamic = 'force-dynamic';
export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const unavailable = (await searchParams).reason === 'unavailable';
  const { accessToken, refreshToken } = await sessionTokens();
  const user = await getAuthenticatedUser(accessToken);
  if (user?.role === 'ADMIN' || user?.role === 'EMPLOYEE') redirect('/panel');
  if (refreshToken && !unavailable) redirect('/api/session/refresh?next=/panel');
  return <LoginForm unavailable={unavailable} />;
}
