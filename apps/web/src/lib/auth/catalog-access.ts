import 'server-only';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser, sessionTokens } from './server';

export async function requireCatalogManage() {
  const { accessToken, refreshToken } = await sessionTokens();
  const user = await getAuthenticatedUser(accessToken);
  if (!user && refreshToken) redirect('/api/session/refresh?next=/panel/catalogo');
  if (!user) redirect('/iniciar-sesion');
  if (user.role !== 'ADMIN' && !user.permissions.includes('CATALOG_MANAGE'))
    redirect('/panel?denied=catalog');
  return user;
}
