import type { Connection, RowDataPacket } from 'mysql2/promise';
import { hash } from 'bcryptjs';
import { required } from '../support/environment';

export const actors = {
  admin: { email: 'admin@e2e.invalid', name: 'QA ADMIN', role: 'ADMIN' },
  employee: { email: 'employee@e2e.invalid', name: 'QA EMPLOYEE limitado', role: 'EMPLOYEE' },
  workshop: { email: 'workshop@e2e.invalid', name: 'QA WORKSHOP', role: 'WORKSHOP' },
  otherWorkshop: { email: 'other-workshop@e2e.invalid', name: 'QA OTRO WORKSHOP', role: 'WORKSHOP' }
} as const;
export async function seedActors(db: Connection) {
  const passwordHash = await hash(required('E2E_ACTOR_PASSWORD'), 10);
  for (const actor of Object.values(actors)) {
    const [roles] = await db.execute<RowDataPacket[]>('SELECT id FROM roles WHERE code = ?', [actor.role]);
    await db.execute(`INSERT INTO users (role_id, full_name, email, password_hash, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [roles[0].id, actor.name, actor.email, passwordHash]);
  }
  // Employee keeps catalog/customer navigation and is denied all other permissions.
  await db.query(`INSERT INTO user_permission_overrides (user_id, permission_id, effect, created_at, updated_at)
    SELECT u.id, p.id, 'DENY', NOW(), NOW() FROM users u CROSS JOIN permissions p
    WHERE u.email = 'employee@e2e.invalid' AND p.code NOT IN ('CATALOG_MANAGE','CUSTOMER_MANAGE')
    ON DUPLICATE KEY UPDATE effect = 'DENY'`);
}
