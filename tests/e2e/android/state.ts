import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from '../support/environment';

// Ignored runtime folder: synthetic IDs only, never tokens or credentials.
const file = resolve(root, '.e2e-local/android/state.json');
export type AndroidJob = { orderId: string; jobId: string; jobCode: string; orderCode: string };
export function readJobs(): AndroidJob[] {
  try { return JSON.parse(readFileSync(file, 'utf8')).jobs; } catch { return []; }
}
export function writeJobs(jobs: AndroidJob[]) {
  mkdirSync(resolve(root, '.e2e-local/android'), { recursive: true });
  writeFileSync(file, JSON.stringify({ jobs }, null, 2));
}
export const evidenceDir = resolve(root, '.e2e-evidence/android');
