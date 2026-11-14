import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Op } from 'sequelize';
import { AdminUsersController, ListManagedUsersQueryDto } from './admin-users.controller';
import { RoleCode } from './auth.types';

function controller(rows: unknown[] = [], count = 0) {
  const users = { findAndCountAll: jest.fn().mockResolvedValue({ rows, count }) };
  const auth = { getAuthenticatedUser: jest.fn().mockResolvedValue({ role: RoleCode.ADMIN }) };
  const instance = new AdminUsersController(users as never, {} as never, {} as never, {} as never, auth as never);
  return { instance, users, auth };
}
const query = (value: Record<string, string>) => plainToInstance(ListManagedUsersQueryDto, value);

describe('AdminUsersController list', () => {
  it('pages results and reports the total instead of silently truncating', async () => {
    const row = { id: '7', fullName: 'Ana', email: 'ana@e2e.invalid', isActive: true, role: { code: 'ADMIN' } };
    const { instance, users } = controller([row], 260);
    const result = await instance.list({ id: '1' }, query({ page: '3', limit: '100' }));
    expect(users.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 100, offset: 200, distinct: true }));
    expect(result.pagination).toEqual({ page: 3, limit: 100, total: 260, totalPages: 3 });
    expect(result.data).toEqual([{ id: '7', fullName: 'Ana', email: 'ana@e2e.invalid', role: 'ADMIN', active: true }]);
  });

  it('filters by literal search, role and status', async () => {
    const { instance, users } = controller();
    await instance.list({ id: '1' }, query({ q: ' 50%_x ', role: 'WORKSHOP', active: 'false' }));
    const options = users.findAndCountAll.mock.calls[0][0];
    expect(options.where.isActive).toBe(false);
    expect(options.where[Op.or]).toEqual([
      { fullName: { [Op.like]: '%50\\%\\_x%' } },
      { email: { [Op.like]: '%50\\%\\_x%' } }
    ]);
    expect(options.include[0]).toMatchObject({ where: { code: 'WORKSHOP' }, required: true });
  });

  it('keeps defaults when no query is sent and rejects oversized pages', async () => {
    const { instance, users } = controller();
    await instance.list({ id: '1' });
    expect(users.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 25, offset: 0 }));
    expect(await validate(query({ limit: '500' }))).not.toHaveLength(0);
    expect(await validate(query({ role: 'ROOT' }))).not.toHaveLength(0);
  });

  it('still requires an administrator', async () => {
    const { instance, auth } = controller();
    auth.getAuthenticatedUser.mockResolvedValue({ role: RoleCode.EMPLOYEE });
    await expect(instance.list({ id: '2' })).rejects.toThrow();
  });
});
