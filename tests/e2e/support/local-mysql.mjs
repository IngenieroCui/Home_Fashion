// Optional Windows provisioner. Uses the installed server binary, never the Windows MySQL service.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { parse } from 'dotenv';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const stateFile = resolve(root, '.e2e-local/owner.json');
const secret = () => randomBytes(32).toString('hex');
const delay = ms => new Promise(done => setTimeout(done, ms));
async function main() {
  if (process.argv.includes('--stop')) {
    const owner = JSON.parse(readFileSync(stateFile, 'utf8'));
    const runtime = resolve(owner.runtime);
    if (!runtime.startsWith(resolve(root, '.e2e-local') + '\\') && !runtime.startsWith(resolve(root, '.e2e-local') + '/')) throw new Error('Runtime fuera de .e2e-local');
    const db = await mysql.createConnection({ host: '127.0.0.1', port: owner.port, user: 'root', password: owner.password });
    const [identity] = await db.query('SELECT @@server_uuid uuid, @@datadir datadir');
    if (identity[0].uuid !== owner.uuid || resolve(identity[0].datadir) !== resolve(runtime, 'data')) throw new Error('Servidor ajeno al provisioner');
    await db.query('SHUTDOWN').catch(error => { if (error.code !== 'PROTOCOL_CONNECTION_LOST') throw error; });
    await db.end().catch(() => {}); console.log('MySQL E2E detenido; datos conservados.'); return;
  }
  if (existsSync(resolve(root, '.env.e2e'))) throw new Error('Ya existe .env.e2e. Conservado; usa la instancia existente o archiva su configuración para provisionar otra.');
  const binary = process.env.E2E_MYSQLD || 'C:/Program Files/MySQL/MySQL Server 8.4/bin/mysqld.exe';
  if (!existsSync(binary)) throw new Error('BLOQUEADO: no hay mysqld instalado; no instalar SDK ni conectar bases compartidas.');
  const port = 33307;
  // Refuse to initialize or mutate an existing server at the selected port.
  const net = await import('node:net');
  await new Promise((done, reject) => {
    const probe = net.createServer(); probe.once('error', () => reject(new Error('Puerto E2E ocupado')));
    probe.listen(port, '127.0.0.1', () => probe.close(done));
  });
  const runId = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${randomBytes(4).toString('hex')}`;
  const runtime = resolve(root, '.e2e-local', runId);
  mkdirSync(runtime, { recursive: true });
  const datadir = resolve(runtime, 'data');
  const initialized = spawnSync(binary, ['--no-defaults', '--initialize-insecure', `--datadir=${datadir}`, '--console'], { windowsHide: true, encoding: 'utf8' });
  if (initialized.status !== 0) throw new Error('Falló inicialización de la nueva instancia MySQL E2E');
  const log = openSync(resolve(runtime, 'server.log'), 'a');
  const child = spawn(binary, ['--no-defaults', `--datadir=${datadir}`, '--bind-address=127.0.0.1', `--port=${port}`, '--mysqlx=0'],
    { detached: true, windowsHide: true, stdio: ['ignore', log, log] });
  child.unref();
  let db;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { db = await mysql.createConnection({ host: '127.0.0.1', port, user: 'root', connectTimeout: 1000 }); break; }
    catch { await delay(500); }
  }
  if (!db) throw new Error('No arrancó la nueva instancia MySQL E2E');
  const password = secret(), ownerPassword = secret(), marker = randomUUID();
  try {
    const [identity] = await db.query('SELECT @@server_uuid uuid, @@datadir datadir');
    if (resolve(identity[0].datadir) !== datadir) throw new Error('Datadir ajeno: prohibido escribir');
    // First write happens only after comparing the server datadir with the newly created directory.
    await db.query("ALTER USER 'root'@'localhost' IDENTIFIED BY ?", [ownerPassword]);
    writeFileSync(stateFile, JSON.stringify({ runtime, port, uuid: identity[0].uuid, password: ownerPassword }));
    await db.query('CREATE DATABASE home_fashion_e2e CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await db.query('CREATE TABLE home_fashion_e2e.e2e_isolation (id INT PRIMARY KEY, marker VARCHAR(64) NOT NULL)');
    await db.execute('INSERT INTO home_fashion_e2e.e2e_isolation VALUES (1, ?)', [marker]);
    await db.query("CREATE USER 'hf_e2e'@'127.0.0.1' IDENTIFIED BY ?", [password]);
    await db.query("GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON home_fashion_e2e.* TO 'hf_e2e'@'127.0.0.1'");
    const config = { E2E_DEDICATED: 'true', E2E_RUN_ID: runId, E2E_SERVER_UUID: identity[0].uuid, E2E_MARKER: marker,
      DB_HOST: '127.0.0.1', DB_PORT: String(port), DB_NAME: 'home_fashion_e2e', DB_USER: 'hf_e2e', DB_PASSWORD: password,
      E2E_ACTOR_PASSWORD: secret(), JWT_ACCESS_SECRET: secret(), JWT_REFRESH_SECRET: secret(),
      JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '1d',
      CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '' };
    // Only explicitly supplied Cloudinary credentials, with folders forced by environment.ts.
    if (process.env.E2E_CLOUDINARY_ENV_FILE) {
      const cloud = parse(readFileSync(resolve(process.env.E2E_CLOUDINARY_ENV_FILE)));
      for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) config[key] = cloud[key] || '';
    }
    writeFileSync(resolve(root, '.env.e2e'), Object.entries(config).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n');
    console.log('MySQL descartable provisionado en 127.0.0.1:33307. Usuario hf_e2e limitado a home_fashion_e2e. Secretos en .env.e2e (ignorado).');
  } finally { await db.end(); }
}
main().catch(() => { console.error('BLOQUEADO: no se pudo provisionar/detener MySQL E2E; configuración existente conservada.'); process.exitCode = 1; });
