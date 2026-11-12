import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import { required } from '../support/environment';

export async function isolatedDatabase(): Promise<Connection> {
  // Also guard here: direct fixture imports cannot bypass the runner.
  if (process.env.E2E_DEDICATED !== 'true' || process.env.DB_HOST !== '127.0.0.1'
    || !/^home_fashion_e2e(?:_[a-z0-9]+)?$/.test(required('DB_NAME'))
    || process.env.DB_USER !== 'hf_e2e' || process.env.DB_PORT === '3306') {
    throw new Error('BLOQUEADO: conexión no dedicada a E2E.');
  }
  let db: Connection;
  try {
    db = await mysql.createConnection({ host: '127.0.0.1', port: Number(required('DB_PORT')),
      user: 'hf_e2e', password: required('DB_PASSWORD'), database: required('DB_NAME'),
      connectTimeout: 5000, supportBigNumbers: true, bigNumberStrings: true });
  } catch { throw new Error('BLOQUEADO: MySQL E2E no está disponible; no se ejecutaron mutaciones.'); }
  try {
    const [identity] = await db.query<RowDataPacket[]>('SELECT DATABASE() db, @@server_uuid uuid, CURRENT_USER() account');
    const [marker] = await db.query<RowDataPacket[]>('SELECT marker FROM e2e_isolation WHERE id = 1');
    const [grants] = await db.query<RowDataPacket[]>('SHOW GRANTS');
    const scope = '`' + required('DB_NAME') + '`.*';
    if (identity[0].db !== required('DB_NAME') || identity[0].uuid !== required('E2E_SERVER_UUID')
      || marker[0]?.marker !== required('E2E_MARKER') || !identity[0].account.startsWith('hf_e2e@')
      || grants.some(row => { const grant = String(Object.values(row)[0]);
        return !grant.startsWith('GRANT USAGE ON *.*') && (!grant.includes(` ON ${scope} TO `) || grant.includes('WITH GRANT OPTION')); })) {
      throw new Error('isolation');
    }
    return db;
  } catch { await db.end(); throw new Error('BLOQUEADO: marcador, servidor o privilegios MySQL no prueban aislamiento E2E.'); }
}
export async function rows(sql: string, values: (string | number)[] = []) {
  if (!/^SELECT\s/i.test(sql.trim())) throw new Error('Las aserciones SQL solo permiten SELECT.');
  const db = await isolatedDatabase();
  try { const [result] = await db.execute<RowDataPacket[]>(sql, values); return result; }
  finally { await db.end(); }
}
