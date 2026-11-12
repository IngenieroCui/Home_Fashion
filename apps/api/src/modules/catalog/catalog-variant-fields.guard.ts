import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

export function requireVariantFields(body: object, permissions: string[], creating = false) {
  if ((creating || Object.prototype.hasOwnProperty.call(body, 'salePrice')) && !permissions.includes('CATALOG_PRICE_EDIT'))
    throw new ForbiddenException('No tienes permiso para editar precios de catálogo');
  if (Object.prototype.hasOwnProperty.call(body, 'estimatedCost') && !permissions.includes('FINANCIAL_COST_EDIT'))
    throw new ForbiddenException('No tienes permiso para editar costos');
}

@Injectable()
export class CatalogVariantFieldsGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ user: { id: string; catalogPermissions?: string[] }; method: string; body?: object }>();
    const { permissions } = await this.auth.getAuthenticatedUser(request.user.id);
    requireVariantFields(request.body ?? {}, permissions, request.method === 'POST');
    request.user.catalogPermissions = permissions;
    return true;
  }
}
