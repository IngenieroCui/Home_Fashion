import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { root } from './environment';

export const evidenceDirectory = resolve(root, '.e2e-evidence');

export function newExecutionId() {
  return `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
}
export function preserveLastSuccess(evidence: string) {
  const folder = resolve(evidence, 'automated-business-journeys');
  const resultPath = resolve(folder, 'results.json');
  const pointer = resolve(evidence, 'automated-business-journeys-last-success.json');
  if (existsSync(pointer) || !existsSync(resultPath)) return;
  const result = JSON.parse(readFileSync(resultPath, 'utf8'));
  if (result.status !== 'passed' || result.results?.length !== 5
    || result.results.some((entry: { status: string }) => entry.status !== 'passed')) return;
  const report = resolve(folder, 'report.md');
  // Only a small Markdown snapshot; the original screenshots/results stay in place.
  if (!existsSync(report)) writeFileSync(report, readFileSync(resolve(evidence, 'automated-business-journeys.md')));
  writeFileSync(pointer, JSON.stringify({ executionId: result.runId, date: result.date,
    results: relative(evidence, resultPath).replace(/\\/g, '/'),
    report: relative(evidence, report).replace(/\\/g, '/'), passed: 5 }, null, 2) + '\n');
}
export function writeRunStatus(evidence: string, executionId: string, status: string, message: string) {
  mkdirSync(evidence, { recursive: true });
  preserveLastSuccess(evidence);
  const state = { executionId, date: new Date().toISOString(), status, message };
  const folder = resolve(evidence, 'automated-business-journeys/runs', executionId);
  mkdirSync(folder, { recursive: true });
  writeFileSync(resolve(folder, 'status.json'), JSON.stringify(state, null, 2) + '\n');
  writeFileSync(resolve(evidence, 'automated-business-journeys-status.json'), JSON.stringify(state, null, 2) + '\n');
}
