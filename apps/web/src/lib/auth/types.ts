export type AuthRole = 'ADMIN' | 'EMPLOYEE' | 'WORKSHOP';
export type AuthPermission = string;

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: AuthRole;
};

export type LoginResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type RefreshResponse = LoginResponse;

export type MeResponse = AuthUser & {
  permissions: AuthPermission[];
};
