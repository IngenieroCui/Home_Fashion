import { createArtifactGlob, resolveDatabaseArtifactDirectory } from './database.paths';
import { MIGRATIONS_META_TABLE, SEEDERS_META_TABLE, resolveMigrationModule } from './umzug.factory';

describe('Umzug configuration', () => {
  it('resolves direct and default-wrapped tsx migration exports without losing handlers', () => {
    const migration = { up: jest.fn(), down: jest.fn() };
    expect(resolveMigrationModule(migration)).toBe(migration);
    expect(resolveMigrationModule({ default: migration })).toBe(migration);
    expect(() => resolveMigrationModule({ up: undefined, down: undefined } as never)).toThrow('up and down');
  });
  it('uses independent metadata tables', () => {
    expect(MIGRATIONS_META_TABLE).toBe('SequelizeMeta');
    expect(SEEDERS_META_TABLE).toBe('SequelizeData');
    expect(MIGRATIONS_META_TABLE).not.toBe(SEEDERS_META_TABLE);
  });

  it('resolves artifacts and excludes declaration files', () => {
    const directory = resolveDatabaseArtifactDirectory('migrations', 'C:/api/database');
    const [, options] = createArtifactGlob(directory);

    expect(directory).toMatch(/[\\/]migrations$/);
    expect(options.ignore).toContain('**/*.d.ts');
  });
});
