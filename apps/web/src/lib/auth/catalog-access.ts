import 'server-only';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser, sessionTokens, sessionRefreshRedirect } from './server';

export async function requireCatalogManage() {
  const { accessToken, refreshToken } = await sessionTokens();
  const user = await getAuthenticatedUser(accessToken);
  if (!user && refreshToken) redirect(await sessionRefreshRedirect());
  if (!user) redirect('/iniciar-sesion');
  if (user.role !== 'ADMIN' && !user.permissions.includes('CATALOG_MANAGE'))
    redirect('/panel?denied=catalog');
  return user;
}
