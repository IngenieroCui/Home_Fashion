import { redirect } from 'next/navigation';
import { getAuthenticatedUser, sessionRefreshRedirect, sessionTokens } from '@/lib/auth/server';
import { ManagedUsers } from '@/components/managed-users';

export default async function UsersPage() {
  const { accessToken, refreshToken } = await sessionTokens();
  const user = await getAuthenticatedUser(accessToken);
  if (!user && refreshToken) redirect(await sessionRefreshRedirect());
  if (user?.role !== 'ADMIN' || !user.permissions.includes('USER_MANAGE')) redirect('/panel');
  return <ManagedUsers actorId={user.id} />;
}
