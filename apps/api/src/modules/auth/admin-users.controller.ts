import {
  BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException,
  Param, Patch, Post, Query, UseGuards
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { hash } from 'bcryptjs';
import { Op, UniqueConstraintError, type Transaction, type WhereOptions } from 'sequelize';
import { AuthService } from './auth.service';
import { RoleCode } from './auth.types';
import { RefreshSession } from './entities/refresh-session.model';
import { Role } from './entities/role.model';
import { User } from './entities/user.model';
import { UserPermissionOverride } from './entities/user-permission-override.model';
import { CurrentUser } from './security/current-user.decorator';
import { JwtAuthGuard } from './security/jwt-auth.guard';
import { PermissionsGuard } from './security/permissions.guard';
import { RequirePermissions } from './security/permissions.decorator';

class CreateManagedUserDto {
  @IsString() @Length(1, 160) fullName!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsEnum(RoleCode) role!: RoleCode;
  @IsString() @Length(14, 72) password!: string;
}
const toNumber = (value: unknown) => typeof value === 'string' ? Number(value) : value;
export class ListManagedUsersQueryDto {
  @Transform(({ value }) => toNumber(value)) @IsOptional() @IsInt() @Min(1) page = 1;
  @Transform(({ value }) => toNumber(value)) @IsOptional() @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional() @IsString() @MaxLength(254) q?: string;
  @IsOptional() @IsEnum(RoleCode) role?: RoleCode;
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsOptional() @IsBoolean() active?: boolean;
}
class UpdateManagedUserDto {
  @IsOptional() @IsEnum(RoleCode) role?: RoleCode;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @Length(14, 72) password?: string;
  @IsOptional() @IsBoolean() revokeSessions?: boolean;
}
const present = (user: User, role?: string) => ({
  id: user.id, fullName: user.fullName, email: user.email, role: role ?? user.role?.code, active: user.isActive
});

@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('USER_MANAGE')
export class AdminUsersController {
  constructor(
    @InjectModel(User) private readonly users: typeof User,
    @InjectModel(Role) private readonly roles: typeof Role,
    @InjectModel(RefreshSession) private readonly sessions: typeof RefreshSession,
    @InjectModel(UserPermissionOverride) private readonly overrides: typeof UserPermissionOverride,
    private readonly auth: AuthService
  ) {}

  private async requireAdmin(id: string, transaction?: Transaction) {
    if (!transaction) {
      const actor = await this.auth.getAuthenticatedUser(id);
      if (actor.role !== RoleCode.ADMIN) throw new ForbiddenException();
      return;
    }
    const admin = await this.roles.findOne({ where: { code: RoleCode.ADMIN }, transaction, lock: transaction.LOCK.UPDATE });
    const actor = await this.users.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!actor?.isActive || !admin || String(actor.roleId) !== String(admin.id)) throw new ForbiddenException();
  }

  @Get()
  async list(@CurrentUser() actor: { id: string }, @Query() query: ListManagedUsersQueryDto = new ListManagedUsersQueryDto()) {
    await this.requireAdmin(actor.id);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const where: WhereOptions = {};
    const term = query.q?.trim();
    if (term) {
      // Escape LIKE wildcards so a search for "50%" or "a_b" is literal.
      const like = `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
      Object.assign(where, { [Op.or]: [{ fullName: { [Op.like]: like } }, { email: { [Op.like]: like } }] });
    }
    if (typeof query.active === 'boolean') Object.assign(where, { isActive: query.active });
    const result = await this.users.findAndCountAll({
      where,
      attributes: ['id', 'fullName', 'email', 'isActive'],
      include: [{ model: Role, attributes: ['code'], ...(query.role ? { where: { code: query.role }, required: true } : {}) }],
      order: [['id', 'DESC']], limit, offset: (page - 1) * limit, distinct: true
    });
    return {
      data: result.rows.map(user => present(user)),
      pagination: { page, limit, total: result.count, totalPages: Math.ceil(result.count / limit) }
    };
  }

  @Post()
  async create(@Body() dto: CreateManagedUserDto, @CurrentUser() actor: { id: string }) {
    await this.requireAdmin(actor.id);
    if (!dto.fullName.trim() || Buffer.byteLength(dto.password) > 72) throw new BadRequestException('Revisa el nombre y la longitud de la contraseña');
    const passwordHash = await hash(dto.password, 12);
    try {
      return await this.users.sequelize!.transaction(async transaction => {
        await this.requireAdmin(actor.id, transaction);
        const role = await this.roles.findOne({ where: { code: dto.role }, transaction });
        if (!role) throw new BadRequestException('Rol no disponible');
        const user = await this.users.create({
          roleId: role.id, fullName: dto.fullName.trim(), email: dto.email.toLowerCase(), passwordHash, isActive: true
        }, { transaction });
        await this.audit(actor.id, user, role.code, 'CREATE', transaction);
        return present(user, role.code);
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) throw new ConflictException('Ya existe una cuenta con ese correo');
      throw error;
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateManagedUserDto, @CurrentUser() actor: { id: string }) {
    await this.requireAdmin(actor.id);
    if (!/^[1-9][0-9]*$/.test(id) || String(actor.id) === id) throw new ForbiddenException('Gestiona los cambios de tu cuenta con otro administrador');
    if (dto.password && Buffer.byteLength(dto.password) > 72) throw new BadRequestException('Contraseña demasiado larga');
    const passwordHash = dto.password ? await hash(dto.password, 12) : undefined;
    return this.users.sequelize!.transaction(async transaction => {
      await this.requireAdmin(actor.id, transaction);
      const user = await this.users.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      const role = dto.role ? await this.roles.findOne({ where: { code: dto.role }, transaction })
        : await this.roles.findByPk(user.roleId, { transaction });
      if (!role) throw new BadRequestException('Rol no disponible');
      const roleChanged = String(role.id) !== String(user.roleId);
      const statusChanged = dto.active !== undefined && dto.active !== null && dto.active !== user.isActive;
      if (!roleChanged && !statusChanged && !passwordHash && dto.revokeSessions !== true) return present(user, role.code);
      await user.update({
        roleId: role.id, isActive: dto.active ?? user.isActive,
        authVersion: (user.authVersion ?? 0) + 1,
        ...(passwordHash ? { passwordHash } : {})
      }, { transaction });
      if (roleChanged) await this.overrides.destroy({ where: { userId: user.id }, transaction });
      await this.sessions.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null }, transaction });
      await this.audit(actor.id, user, role.code, passwordHash ? 'PASSWORD_RESET' : 'UPDATE_REVOKE', transaction);
      return present(user, role.code);
    });
  }

  private async audit(actorId: string, user: User, role: string, action: string, transaction: Transaction) {
    await this.users.sequelize!.query(
      'INSERT INTO user_admin_events (actor_id, target_id, action, role_code, active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      { replacements: [actorId, user.id, action, role, user.isActive], transaction }
    );
  }
}
