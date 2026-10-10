import { checkSuiteStock } from './stock';
import { isolatedDatabase } from '../fixtures/database';
import { seedActors } from '../fixtures/actors';
import { seedCatalog } from '../fixtures/catalog';
import { createStandaloneConnection } from '../../../apps/api/src/database/standalone.connection';
import { createMigrator } from '../../../apps/api/src/database/umzug.factory';
import { up as seedPermissions } from '../../../apps/api/src/database/seeders/20260804170500-seed-auth-roles-permissions';

export async function prepare() {
  const guard = await isolatedDatabase();
  await guard.end();
  const { sequelize } = await createStandaloneConnection();
  try {
    await createMigrator(sequelize).up();
    const [roles] = await sequelize.query('SELECT id FROM roles LIMIT 1');
    if (!roles.length) await seedPermissions({ context: sequelize.getQueryInterface() });
  } finally { await sequelize.close(); }
  const db = await isolatedDatabase();
  try {
    await db.beginTransaction();
    await seedActors(db);
    await seedCatalog(db);
    await checkSuiteStock(db);
    await db.commit();
  } catch (error) { await db.rollback(); throw error; }
  finally { await db.end(); }
}
