import * as bcrypt from 'bcryptjs';
import { RoleCode } from './modules/auth/auth.types';
import { createUser, parseUserCreateArgs, type UserCreateDependencies } from './user-create';

describe('user:create', () => {
  it('normalizes valid arguments and limits roles to supported staff roles', () => {
    expect(parseUserCreateArgs([' Ana ', ' ANA@Example.com ', 'password-123', 'workshop'])).toEqual({
      fullName: 'Ana',
      email: 'ana@example.com',
      password: 'password-123',
      role: RoleCode.WORKSHOP
    });
    expect(() => parseUserCreateArgs(['Ana', 'not-an-email', 'password-123', 'ADMIN'])).toThrow('Uso:');
    expect(() => parseUserCreateArgs(['Ana', 'ana@example.com', 'password-123', 'CUSTOMER'])).toThrow('Rol inválido');
  });

  it('creates an active user with a bcrypt hash and never accepts duplicates', async () => {
    let inserted: Parameters<UserCreateDependencies['insertUser']>[0] | undefined;
    const dependencies: UserCreateDependencies = {
      findRoleId: jest.fn().mockResolvedValue('3'),
      userExists: jest.fn().mockResolvedValue(false),
      hashPassword: (password) => bcrypt.hash(password, 12),
      insertUser: async (input) => { inserted = input; }
    };
    const input = parseUserCreateArgs(['Ana', 'ana@example.com', 'password-123', 'WORKSHOP']);

    await createUser(input, dependencies);

    expect(inserted).toMatchObject({ fullName: 'Ana', email: 'ana@example.com', roleId: '3' });
    expect(inserted?.passwordHash).not.toBe(input.password);
    await expect(bcrypt.compare(input.password, inserted!.passwordHash)).resolves.toBe(true);

    await expect(createUser(input, { ...dependencies, userExists: async () => true })).rejects.toThrow('Ya existe');
  });
});
