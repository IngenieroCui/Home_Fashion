import * as bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PermissionEffect, RoleCode } from './auth.types';

describe('AuthService', () => {
  const createUser = (role = RoleCode.ADMIN) => ({
    id: '1', roleId: '1', fullName: 'Ana', email: 'ana@example.com', passwordHash: '', isActive: true,
    role: { code: role }, update: jest.fn(),
  });
  const users = { findOne: jest.fn(), findByPk: jest.fn() };
  const sessions = {
    create: jest.fn(), findOne: jest.fn(), update: jest.fn(),
    sequelize: { query: jest.fn(), transaction: jest.fn(), LOCK: { UPDATE: 'UPDATE' } },
  };
  const usersWithDb = { ...users, sequelize: sessions.sequelize };
  const roles = { findByPk: jest.fn() };
  const permissions = { sequelize: { query: jest.fn() } };
  const config = {
    getOrThrow: jest.fn((key: string) => key.includes('ACCESS') ? 'a'.repeat(32) : 'b'.repeat(32)),
    get: jest.fn((_: string, fallback: string) => fallback),
  };
  const service = new AuthService(usersWithDb as never, roles as never, permissions as never, {} as never, sessions as never, config as never);

  beforeEach(() => {
    jest.clearAllMocks();
    roles.findByPk.mockResolvedValue({ code: RoleCode.ADMIN });
    sessions.sequelize.transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) => callback(sessions.sequelize));
  });

  it('logs in an active user without exposing passwordHash', async () => {
    const user = createUser();
    user.passwordHash = await bcrypt.hash('password123', 4);
    users.findOne.mockResolvedValue(user);

    const result = await service.login(' ANA@EXAMPLE.COM ', 'password123');

    expect(result.user).toEqual({ id: '1', fullName: 'Ana', email: 'ana@example.com', role: 'ADMIN' });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(sessions.create).toHaveBeenCalled();
  });

  it('rejects incorrect and unknown credentials with the same generic response', async () => {
    const user = createUser();
    user.passwordHash = await bcrypt.hash('password123', 4);
    users.findOne.mockResolvedValueOnce(user).mockResolvedValueOnce(null);

    await expect(service.login(user.email, 'wrongpass')).rejects.toMatchObject({ message: 'Invalid credentials' });
    await expect(service.login(user.email, 'password123')).rejects.toMatchObject({ message: 'Invalid credentials' });
  });

  it('rejects inactive users', async () => {
    const user = createUser();
    user.isActive = false;
    users.findOne.mockResolvedValue(user);

    await expect(service.login(user.email, 'password123')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates a valid refresh token into a new session and new tokens', async () => {
    const user = createUser();
    user.passwordHash = await bcrypt.hash('password123', 4);
    users.findOne.mockResolvedValue(user);
    const initial = await service.login(user.email, 'password123');
    const session = { revokedAt: null, expiresAt: new Date(Date.now() + 60_000), userId: user.id, update: jest.fn() };
    sessions.findOne.mockResolvedValueOnce(session).mockResolvedValueOnce({ id: '2' });
    users.findByPk.mockResolvedValue(user);

    const rotated = await service.refresh(initial.refreshToken);

    expect(rotated.refreshToken).not.toBe(initial.refreshToken);
    expect(rotated.accessToken).not.toBe(initial.accessToken);
    expect(sessions.create).toHaveBeenCalledTimes(2);
    expect(session.update).toHaveBeenCalledWith(expect.objectContaining({ revokedAt: expect.any(Date), replacedBySessionId: '2' }), expect.anything());
  });

  it('rejects reuse of a refresh token after rotation', async () => {
    const user = createUser();
    user.passwordHash = await bcrypt.hash('password123', 4);
    users.findOne.mockResolvedValue(user);
    const initial = await service.login(user.email, 'password123');
    const session = { revokedAt: null as Date | null, expiresAt: new Date(Date.now() + 60_000), userId: user.id, update: jest.fn(async (value: { revokedAt: Date }) => { session.revokedAt = value.revokedAt; }) };
    sessions.findOne.mockResolvedValueOnce(session).mockResolvedValueOnce({ id: '2' }).mockResolvedValueOnce(session);
    users.findByPk.mockResolvedValue(user);

    await service.refresh(initial.refreshToken);
    await expect(service.refresh(initial.refreshToken)).rejects.toMatchObject({ message: 'Invalid credentials' });
  });

  it('rejects a revoked refresh token', async () => {
    const user = createUser();
    user.passwordHash = await bcrypt.hash('password123', 4);
    users.findOne.mockResolvedValue(user);
    const initial = await service.login(user.email, 'password123');
    sessions.findOne.mockResolvedValue({ revokedAt: new Date(), expiresAt: new Date(Date.now() + 60_000), userId: user.id });

    await expect(service.refresh(initial.refreshToken)).rejects.toMatchObject({ message: 'Invalid credentials' });
  });

  it('invalidates prior access tokens after revocation or inactivation', async () => {
    const user = { ...createUser(), authVersion: 2 };
    users.findByPk.mockResolvedValue(user);
    await expect(service.validateAccessSession({ sub: '1', role: RoleCode.ADMIN, type: 'access', version: 1 })).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.validateAccessSession({ sub: '1', role: RoleCode.ADMIN, type: 'access', version: 2 })).resolves.toBeUndefined();
    user.isActive = false;
    await expect(service.validateAccessSession({ sub: '1', role: RoleCode.ADMIN, type: 'access', version: 2 })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows logout to be called more than once', async () => {
    await expect(service.logout('refresh-token')).resolves.toBeUndefined();
    await expect(service.logout('refresh-token')).resolves.toBeUndefined();
    expect(sessions.update).toHaveBeenCalledTimes(2);
  });

  it('returns only user, role, and effective permissions for /auth/me', async () => {
    const user = createUser(RoleCode.EMPLOYEE);
    users.findByPk.mockResolvedValue(user);
    permissions.sequelize.query.mockResolvedValueOnce([{ code: 'ORDER_MANAGE' }]).mockResolvedValueOnce([]);

    const result = await service.getAuthenticatedUser(user.id);

    expect(result).toEqual({ id: user.id, fullName: user.fullName, email: user.email, role: 'EMPLOYEE', permissions: ['ORDER_MANAGE'] });
    expect(JSON.stringify(result)).not.toMatch(/passwordHash|tokenHash|secret|session/i);
  });

  it('gives WORKSHOP only its operational permissions', async () => {
    const user = createUser(RoleCode.WORKSHOP);
    permissions.sequelize.query.mockResolvedValueOnce([{ code: 'WORKSHOP_JOB_VIEW' }, { code: 'WORKSHOP_PROGRESS_SUBMIT' }]).mockResolvedValueOnce([]);

    await expect(service.effectivePermissions(user as never)).resolves.toEqual(['WORKSHOP_JOB_VIEW', 'WORKSHOP_PROGRESS_SUBMIT']);
  });

  it('does not allow a DENY override to reduce ADMIN permissions', async () => {
    const user = createUser();
    permissions.sequelize.query.mockResolvedValue([{ code: 'CATALOG_MANAGE' }, { code: 'WORKSHOP_JOB_VIEW' }]);

    await expect(service.effectivePermissions(user as never)).resolves.toEqual(['CATALOG_MANAGE', 'WORKSHOP_JOB_VIEW']);
    expect(permissions.sequelize.query).toHaveBeenCalledTimes(1);
    expect(permissions.sequelize.query.mock.calls[0][0]).toBe('SELECT p.code FROM permissions p');
  });

  it('applies ALLOW and DENY permission overrides after role permissions for non-admin users', async () => {
    const user = createUser(RoleCode.EMPLOYEE);
    permissions.sequelize.query.mockResolvedValueOnce([{ code: 'CATALOG_MANAGE' }, { code: 'SALE_MANAGE' }]).mockResolvedValueOnce([{ code: 'QUOTE_MANAGE', effect: PermissionEffect.ALLOW }, { code: 'SALE_MANAGE', effect: PermissionEffect.DENY }]);

    await expect(service.effectivePermissions(user as never)).resolves.toEqual(['CATALOG_MANAGE', 'QUOTE_MANAGE']);
  });
});
