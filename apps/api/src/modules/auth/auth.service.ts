import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { sign, verify } from 'jsonwebtoken';
import { QueryTypes, type Transaction } from 'sequelize';
import { ConfigService } from '@nestjs/config';
import { PermissionEffect, RoleCode, type JwtPayload } from './auth.types';
import { Permission } from './entities/permission.model';
import { RefreshSession } from './entities/refresh-session.model';
import { Role } from './entities/role.model';
import { User } from './entities/user.model';
import { UserPermissionOverride } from './entities/user-permission-override.model';

const invalidCredentials = () => new UnauthorizedException('Invalid credentials');
const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(@InjectModel(User) private readonly users: typeof User, @InjectModel(Role) private readonly roles: typeof Role, @InjectModel(Permission) private readonly permissions: typeof Permission, @InjectModel(UserPermissionOverride) private readonly overrides: typeof UserPermissionOverride, @InjectModel(RefreshSession) private readonly sessions: typeof RefreshSession, private readonly config: ConfigService) {}

  private accessSecret() { return this.config.getOrThrow<string>('JWT_ACCESS_SECRET'); }
  private refreshSecret() { return this.config.getOrThrow<string>('JWT_REFRESH_SECRET'); }
  private accessExpiry() { return this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'); }
  private refreshExpiry() { return this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'); }
  private publicUser(user: User) { return { id: user.id, fullName: user.fullName, email: user.email, role: user.role?.code }; }
  private expiresAt() { const raw = this.refreshExpiry(); const match = /^(\d+)([smhd])$/.exec(raw); const factor = match?.[2] === 's' ? 1000 : match?.[2] === 'm' ? 60000 : match?.[2] === 'h' ? 3600000 : 86400000; return new Date(Date.now() + Number(match?.[1] ?? 30) * factor); }
  private accessToken(user: User) { return sign({ sub: user.id, role: user.role!.code, type: 'access', jti: randomUUID() }, this.accessSecret(), { expiresIn: this.accessExpiry() as never }); }
  private refreshToken(user: User) { return sign({ sub: user.id, role: user.role!.code, type: 'refresh', jti: randomUUID() }, this.refreshSecret(), { expiresIn: this.refreshExpiry() as never }); }

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email: email.trim().toLowerCase() }, include: [Role] });
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) throw invalidCredentials();
    await user.update({ lastLoginAt: new Date() });
    return this.issue(user);
  }

  private async issue(user: User, transaction?: Transaction) {
    const refreshToken = this.refreshToken(user);
    await this.sessions.create({ userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: this.expiresAt(), revokedAt: null, replacedBySessionId: null }, { transaction });
    return { user: this.publicUser(user), accessToken: this.accessToken(user), refreshToken };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try { payload = verify(refreshToken, this.refreshSecret()) as JwtPayload; } catch { throw invalidCredentials(); }
    if (payload.type !== 'refresh') throw invalidCredentials();
    const sequelize = this.sessions.sequelize!;
    return sequelize.transaction(async (transaction) => {
      const session = await this.sessions.findOne({ where: { tokenHash: hashToken(refreshToken) }, transaction, lock: transaction.LOCK.UPDATE });
      if (!session || session.revokedAt || session.expiresAt <= new Date()) throw invalidCredentials();
      const user = await this.users.findByPk(session.userId, { include: [Role], transaction, lock: transaction.LOCK.UPDATE });
      if (!user || !user.isActive) throw invalidCredentials();
      const result = await this.issue(user, transaction);
      const replacement = await this.sessions.findOne({ where: { tokenHash: hashToken(result.refreshToken) }, transaction });
      await session.update({ revokedAt: new Date(), replacedBySessionId: replacement!.id }, { transaction });
      return result;
    });
  }

  async logout(refreshToken: string) { await this.sessions.update({ revokedAt: new Date() }, { where: { tokenHash: hashToken(refreshToken), revokedAt: null } }); }

  async getAuthenticatedUser(id: string) {
    const user = await this.users.findByPk(id, { include: [Role] });
    if (!user || !user.isActive) throw invalidCredentials();
    return { ...this.publicUser(user), permissions: await this.effectivePermissions(user) };
  }

  async effectivePermissions(user: User): Promise<string[]> {
    const sequelize = this.permissions.sequelize!;
    if (user.role?.code === RoleCode.ADMIN) {
      const permissions = await sequelize.query<{ code: string }>('SELECT p.code FROM permissions p', { type: QueryTypes.SELECT });
      return permissions.map((permission) => permission.code).sort();
    }
    const rolePermissions = await sequelize.query<{ code: string }>('SELECT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id WHERE rp.role_id = :roleId', { replacements: { roleId: user.roleId }, type: QueryTypes.SELECT });
    const overrides = await sequelize.query<{ code: string; effect: PermissionEffect }>('SELECT p.code, upo.effect FROM permissions p JOIN user_permission_overrides upo ON upo.permission_id = p.id WHERE upo.user_id = :userId', { replacements: { userId: user.id }, type: QueryTypes.SELECT });
    const effective = new Set(rolePermissions.map((permission) => permission.code));
    for (const override of overrides) { if (override.effect === PermissionEffect.ALLOW) effective.add(override.code); else effective.delete(override.code); }
    return [...effective].sort();
  }

  verifyAccessToken(token: string): JwtPayload { try { const payload = verify(token, this.accessSecret()) as JwtPayload; if (payload.type !== 'access') throw new Error(); return payload; } catch { throw invalidCredentials(); } }
}
