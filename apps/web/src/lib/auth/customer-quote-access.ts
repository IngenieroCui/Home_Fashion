import 'server-only';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser, sessionTokens, sessionRefreshRedirect } from './server';

async function requirePermission(permission: string, denied: string) {
  const { accessToken, refreshToken } = await sessionTokens();
  const user = await getAuthenticatedUser(accessToken);
  if (!user && refreshToken) redirect(await sessionRefreshRedirect());
  if (!user || user.role === 'WORKSHOP') redirect('/iniciar-sesion');
  if (user.role !== 'ADMIN' && !user.permissions.includes(permission))
    redirect(`/panel?denied=${denied}`);
  return user;
}

async function requireAnyPermission(permissions: string[], denied: string) {
  const { accessToken, refreshToken } = await sessionTokens();
  const user = await getAuthenticatedUser(accessToken);
  if (!user && refreshToken) redirect(await sessionRefreshRedirect());
  if (!user || user.role === 'WORKSHOP') redirect('/iniciar-sesion');
  if (
    user.role !== 'ADMIN' &&
    !permissions.some((permission) => user.permissions.includes(permission))
  )
    redirect(`/panel?denied=${denied}`);
  return user;
}

export const requireCustomerManage = () => requirePermission('CUSTOMER_MANAGE', 'customers');
export const requireQuoteManage = () => requirePermission('QUOTE_MANAGE', 'quotes');
export const requireSaleManage = () => requirePermission('SALE_MANAGE', 'sales');
export const requireOrderManage = () => requirePermission('ORDER_MANAGE', 'orders');
export const requireWorkshopManage = () => requirePermission('WORKSHOP_MANAGE', 'workshops');
export const requireProgressReview = () =>
  requirePermission('PROGRESS_REVIEW', 'workshop-progress');
export const requireWorkshopAccess = () =>
  requireAnyPermission(['WORKSHOP_MANAGE', 'PROGRESS_REVIEW'], 'workshops');
