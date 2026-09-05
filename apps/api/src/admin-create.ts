import * as bcrypt from 'bcryptjs';
import { QueryTypes } from 'sequelize';
import { createStandaloneConnection } from './database/standalone.connection';

async function main() {
  const [fullName, emailInput, password] = process.argv.slice(2);
  if (!fullName || !emailInput || !password || password.length < 8) throw new Error('Uso: pnpm admin:create -- "Nombre" correo@ejemplo.com contraseña-de-8-caracteres');
  const email = emailInput.trim().toLowerCase();
  const { sequelize } = await createStandaloneConnection();
  try {
    const roles = await sequelize.query<{ id: string }>("SELECT id FROM roles WHERE code = 'ADMIN' LIMIT 1", { type: QueryTypes.SELECT });
    if (!roles.length) throw new Error('El rol ADMIN no existe. Ejecuta primero pnpm db:migrate y pnpm db:seed.');
    const existing = await sequelize.query<{ id: string }>('SELECT id FROM users WHERE email = ?', { replacements: [email], type: QueryTypes.SELECT });
    if (existing.length) throw new Error('Ya existe un usuario con ese correo.');
    await sequelize.query('INSERT INTO users (role_id, full_name, email, password_hash, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, true, NOW(), NOW())', { replacements: [roles[0].id, fullName.trim(), email, await bcrypt.hash(password, 12)] });
    console.info(`Administrador creado para ${email}.`);
  } finally { await sequelize.close(); }
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'No se pudo crear el administrador.'); process.exitCode = 1; });
