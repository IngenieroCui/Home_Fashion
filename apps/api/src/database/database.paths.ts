import { resolve } from 'node:path';

export type DatabaseArtifact = 'migrations' | 'seeders';

export function resolveDatabaseArtifactDirectory(
  artifact: DatabaseArtifact,
  baseDirectory = __dirname
): string {
  return resolve(baseDirectory, artifact);
}

export function createArtifactGlob(directory: string): [string, { cwd: string; ignore: string[] }] {
  return ['*.{js,ts}', { cwd: directory, ignore: ['**/*.d.ts', '**/*.spec.ts', '**/*.spec.js'] }];
}
