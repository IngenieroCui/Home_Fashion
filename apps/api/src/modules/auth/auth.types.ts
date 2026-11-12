export enum RoleCode { ADMIN = 'ADMIN', EMPLOYEE = 'EMPLOYEE', WORKSHOP = 'WORKSHOP' }
export enum PermissionEffect { ALLOW = 'ALLOW', DENY = 'DENY' }
export type JwtPayload = { sub: string; role: RoleCode; type: 'access' | 'refresh'; version?: number };
