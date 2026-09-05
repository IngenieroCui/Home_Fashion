import { redirect } from 'next/navigation';
import { PanelShell } from '@/components/panel-shell';
import { getAuthenticatedUser, sessionTokens } from '@/lib/auth/server';
export const dynamic = 'force-dynamic';
export default async function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { accessToken, refreshToken } = await sessionTokens();
  if (!accessToken && refreshToken) redirect('/api/session/refresh?next=/panel');
  if (!accessToken) redirect('/iniciar-sesion');
  const user = await getAuthenticatedUser(accessToken);
  if (!user && refreshToken) redirect('/api/session/refresh?next=/panel');
  if (!user || user.role === 'WORKSHOP') redirect('/iniciar-sesion');
  return <PanelShell user={user}>{children}</PanelShell>;
}
