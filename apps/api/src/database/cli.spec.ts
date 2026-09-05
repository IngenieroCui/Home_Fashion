import { parseDatabaseCommand } from './cli';

describe('database CLI commands', () => {
  it('accepts valid commands and rejects unknown commands', () => {
    expect(parseDatabaseCommand('migrate:status')).toBe('migrate:status');
    expect(parseDatabaseCommand('seed:undo:all')).toBe('seed:undo:all');
    expect(parseDatabaseCommand('invalid')).toBeUndefined();
  });
});
