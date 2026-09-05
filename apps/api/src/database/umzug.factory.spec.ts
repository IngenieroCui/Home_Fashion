import { createArtifactGlob, resolveDatabaseArtifactDirectory } from './database.paths';
import { MIGRATIONS_META_TABLE, SEEDERS_META_TABLE } from './umzug.factory';

describe('Umzug configuration', () => {
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
