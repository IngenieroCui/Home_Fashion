import { employee, permissions, up, workshop } from './20260804170500-seed-auth-roles-permissions';

describe('auth roles and permissions seed', () => {
  it('assigns all registered permissions to ADMIN', async () => {
    const bulkInsert = jest.fn();
    await up({ context: { sequelize: { transaction: async (callback: (transaction: unknown) => unknown) => callback({}) }, bulkInsert } } as never);

    const assignments = bulkInsert.mock.calls[2][1] as Array<{ role_id: number; permission_id: number }>;
    expect(assignments.filter((assignment) => assignment.role_id === 1).map((assignment) => assignment.permission_id).sort((left, right) => left - right)).toEqual(permissions.map((_, index) => index + 1));
  });

  it('keeps internal workshop operation permissions with EMPLOYEE', () => {
    expect(employee).toEqual(expect.arrayContaining(['WORKSHOP_MANAGE', 'PROGRESS_REVIEW']));
    expect(employee).not.toEqual(expect.arrayContaining(['WORKSHOP_JOB_VIEW', 'WORKSHOP_PROGRESS_SUBMIT']));
  });

  it('gives EMPLOYEE payment registration but not payment correction', () => {
    expect(employee).toContain('FINANCIAL_PAYMENT_REGISTER');
    expect(employee).not.toContain('FINANCIAL_PAYMENT_CORRECT');
  });

  it('gives WORKSHOP only its assigned-job operational permissions', () => {
    expect(workshop).toEqual(['WORKSHOP_JOB_VIEW', 'WORKSHOP_PROGRESS_SUBMIT']);
    expect(workshop).not.toEqual(expect.arrayContaining(['WORKSHOP_MANAGE', 'PROGRESS_REVIEW', 'FINANCIAL_SALE_VIEW', 'FINANCIAL_PAYMENT_REGISTER', 'FINANCIAL_PAYMENT_CORRECT']));
  });
});
