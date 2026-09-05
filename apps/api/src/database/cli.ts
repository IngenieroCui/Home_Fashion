import type { Umzug } from 'umzug';
import { createStandaloneConnection, formatDatabaseError } from './standalone.connection';
import { createMigrator, createSeeder } from './umzug.factory';
import type { DatabaseMigrationContext } from './migration.types';

export type DatabaseCommand =
  | 'migrate'
  | 'migrate:status'
  | 'migrate:undo'
  | 'migrate:undo:all'
  | 'seed'
  | 'seed:status'
  | 'seed:undo'
  | 'seed:undo:all';

const commands: DatabaseCommand[] = [
  'migrate',
  'migrate:status',
  'migrate:undo',
  'migrate:undo:all',
  'seed',
  'seed:status',
  'seed:undo',
  'seed:undo:all'
];

export function parseDatabaseCommand(value: string | undefined): DatabaseCommand | undefined {
  return commands.find((command) => command === value);
}

function getLabel(command: DatabaseCommand): string {
  return command.startsWith('seed') ? 'Seeders' : 'Migraciones';
}

async function showStatus(
  umzug: Umzug<DatabaseMigrationContext>,
  label: string
): Promise<void> {
  const [executed, pending] = await Promise.all([umzug.executed(), umzug.pending()]);
  console.info(`${label}: ${executed.length} ejecutados, ${pending.length} pendientes.`);
}

async function executeCommand(
  umzug: Umzug<DatabaseMigrationContext>,
  command: DatabaseCommand
): Promise<void> {
  const label = getLabel(command);

  if (command.endsWith(':status')) {
    await showStatus(umzug, label);
    return;
  }

  if (command.endsWith(':undo:all')) {
    const executed = await umzug.executed();
    if (executed.length === 0) {
      console.info(`${label}: no hay elementos ejecutados para revertir.`);
      return;
    }

    await umzug.down({ to: 0 });
    console.info(`${label}: todos los elementos ejecutados fueron revertidos.`);
    return;
  }

  if (command.endsWith(':undo')) {
    const executed = await umzug.executed();
    if (executed.length === 0) {
      console.info(`${label}: no hay elementos ejecutados para revertir.`);
      return;
    }

    await umzug.down();
    console.info(`${label}: último elemento revertido.`);
    return;
  }

  const results = await umzug.up();
  console.info(`${label}: ${results.length} elementos aplicados.`);
}

async function main(): Promise<void> {
  const command = parseDatabaseCommand(process.argv[2]);
  if (!command) {
    console.error(`Comando inválido. Usa uno de: ${commands.join(', ')}.`);
    process.exitCode = 1;
    return;
  }

  let connection: Awaited<ReturnType<typeof createStandaloneConnection>> | undefined;

  try {
    connection = await createStandaloneConnection();
    const umzug = command.startsWith('seed')
      ? createSeeder(connection.sequelize)
      : createMigrator(connection.sequelize);

    await executeCommand(umzug, command);
  } catch (error) {
    console.error(
      connection ? formatDatabaseError(error, connection.config) : error instanceof Error ? error.message : 'Database command failed.'
    );
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.sequelize.close();
    }
  }
}

if (require.main === module) {
  void main();
}
