import type { DatabaseMigration } from '../migration.types';
export const permissions = [
  'CATALOG_MANAGE',
  'CUSTOMER_MANAGE',
  'QUOTE_MANAGE',
  'SALE_MANAGE',
  'ORDER_MANAGE',
  'WORKSHOP_MANAGE',
  'PROGRESS_REVIEW',
  'WORKSHOP_JOB_VIEW',
  'WORKSHOP_PROGRESS_SUBMIT',
  'DELIVERY_MANAGE',
  'USER_MANAGE',
  'PERMISSION_MANAGE',
  'AUDIT_VIEW',
  'FINANCIAL_SALE_VIEW',
  'FINANCIAL_COST_VIEW',
  'FINANCIAL_COST_EDIT',
  'FINANCIAL_MARGIN_VIEW',
  'FINANCIAL_REPORT_VIEW',
  'CATALOG_PRICE_EDIT',
  'SALE_PRICE_OVERRIDE',
  'FINANCIAL_PAYMENT_REGISTER',
  'FINANCIAL_PAYMENT_CORRECT'
];
export const employee = [
  'CATALOG_MANAGE',
  'CUSTOMER_MANAGE',
  'QUOTE_MANAGE',
  'SALE_MANAGE',
  'ORDER_MANAGE',
  'WORKSHOP_MANAGE',
  'PROGRESS_REVIEW',
  'DELIVERY_MANAGE',
  'FINANCIAL_SALE_VIEW',
  'FINANCIAL_PAYMENT_REGISTER'
];
export const workshop = ['WORKSHOP_JOB_VIEW', 'WORKSHOP_PROGRESS_SUBMIT'];
export const up: DatabaseMigration['up'] = async ({ context }) => {
  const now = new Date();
  await context.sequelize.transaction(async (transaction) => {
    await context.bulkInsert(
      'roles',
      [
        { id: 1, code: 'ADMIN', name: 'Propietario', created_at: now, updated_at: now },
        { id: 2, code: 'EMPLOYEE', name: 'Empleada', created_at: now, updated_at: now },
        { id: 3, code: 'WORKSHOP', name: 'Taller', created_at: now, updated_at: now }
      ],
      { transaction }
    );
    await context.bulkInsert(
      'permissions',
      permissions.map((code, index) => ({
        id: index + 1,
        code,
        description: code.replaceAll('_', ' '),
        created_at: now,
        updated_at: now
      })),
      { transaction }
    );
    const ids = Object.fromEntries(permissions.map((code, index) => [code, index + 1]));
    await context.bulkInsert(
      'role_permissions',
      [
        { role_id: 1, permission_id: 1 },
        ...permissions.map((code) => ({ role_id: 1, permission_id: ids[code] })),
        ...employee.map((code) => ({ role_id: 2, permission_id: ids[code] })),
        ...workshop.map((code) => ({ role_id: 3, permission_id: ids[code] }))
      ].filter((row, index, rows) => index !== 1 || rows[0].permission_id !== row.permission_id),
      { transaction }
    );
  });
};
export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.bulkDelete('role_permissions', {}, { transaction });
    await context.bulkDelete('permissions', {}, { transaction });
    await context.bulkDelete('roles', {}, { transaction });
  });
};
