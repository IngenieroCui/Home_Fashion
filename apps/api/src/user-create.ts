import * as bcrypt from 'bcryptjs';
import { QueryTypes } from 'sequelize';
import { RoleCode } from './modules/auth/auth.types';
import { createStandaloneConnection } from './database/standalone.connection';

export type UserCreateInput = {
  fullName: string;
  email: string;
  password: string;
  role: RoleCode.ADMIN | RoleCode.EMPLOYEE | RoleCode.WORKSHOP;
};

export type UserCreateDependencies = {
  findRoleId: (role: UserCreateInput['role']) => Promise<string | undefined>;
  userExists: (email: string) => Promise<boolean>;
  hashPassword: (password: string) => Promise<string>;
  insertUser: (input: Omit<UserCreateInput, 'password' | 'role'> & { roleId: string; passwordHash: string }) => Promise<void>;
};

const allowedRoles = new Set<UserCreateInput['role']>([
  RoleCode.ADMIN,
  RoleCode.EMPLOYEE,
  RoleCode.WORKSHOP
]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseUserCreateArgs(args: string[]): UserCreateInput {
  const [fullNameInput, emailInput, password, roleInput] = args;
  const fullName = fullNameInput?.trim();
  const email = emailInput?.trim().toLowerCase();
  const role = roleInput?.trim().toUpperCase() as UserCreateInput['role'];

  if (!fullName || fullName.length > 160 || !email || !emailPattern.test(email) || email.length > 254 || !password || password.length < 8 || !roleInput) {
    throw new Error('Uso: pnpm user:create -- "Nombre" correo@ejemplo.com contraseña-de-al-menos-8-caracteres ADMIN|EMPLOYEE|WORKSHOP');
  }
  if (!allowedRoles.has(role)) {
    throw new Error('Rol inválido. Usa ADMIN, EMPLOYEE o WORKSHOP.');
  }

  return { fullName, email, password, role };
}

export async function createUser(input: UserCreateInput, dependencies: UserCreateDependencies): Promise<void> {
  const roleId = await dependencies.findRoleId(input.role);
  if (!roleId) {
    throw new Error(`El rol ${input.role} no existe. Ejecuta primero pnpm db:migrate y pnpm db:seed.`);
  }
  if (await dependencies.userExists(input.email)) {
    throw new Error('Ya existe un usuario con ese correo.');
  }

  const passwordHash = await dependencies.hashPassword(input.password);
  await dependencies.insertUser({
    fullName: input.fullName,
    email: input.email,
    roleId,
    passwordHash
  });
}

async function main(): Promise<void> {
  const input = parseUserCreateArgs(process.argv.slice(2));
  const { sequelize } = await createStandaloneConnection();

  try {
    await createUser(input, {
      findRoleId: async (role) => {
        const roles = await sequelize.query<{ id: string }>(
          'SELECT id FROM roles WHERE code = ? LIMIT 1',
          { replacements: [role], type: QueryTypes.SELECT }
        );
        return roles[0]?.id;
      },
      userExists: async (email) => {
        const users = await sequelize.query<{ id: string }>(
          'SELECT id FROM users WHERE email = ? LIMIT 1',
          { replacements: [email], type: QueryTypes.SELECT }
        );
        return users.length > 0;
      },
      hashPassword: (password) => bcrypt.hash(password, 12),
      insertUser: async ({ fullName, email, passwordHash, roleId }) => {
        await sequelize.query(
          'INSERT INTO users (role_id, full_name, email, password_hash, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, true, NOW(), NOW())',
          { replacements: [roleId, fullName, email, passwordHash] }
        );
      }
    });
    console.info(`Usuario ${input.role} creado para ${input.email}.`);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'No se pudo crear el usuario.');
    process.exitCode = 1;
  });
}
