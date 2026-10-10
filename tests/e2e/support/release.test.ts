import JourneyReporter from './reporter';
import type { FullResult, TestCase, TestResult } from '@playwright/test/reporter';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { assertSuiteStock, checkSuiteStock } from './stock';
import { preserveLastSuccess, writeRunStatus } from './history';
import type { Connection } from 'mysql2/promise';

test('three stock units suffice; exhausted/invalid stock fails before journeys', () => {
  assert.equal(assertSuiteStock(20, 17), 3);
  for (const values of [[20, 18], [20, 20], [1, 2], [NaN, 0], [20, -1]]) {
    assert.throws(() => assertSuiteStock(...values as [number, number]), /BLOQUEADO: inventario E2E insuficiente/);
  }
});
test('stock query reads only the active dedicated catalog and blocks a missing variant', async () => {
  process.env.E2E_RUN_ID = 'synthetic-run';
  const db = { execute: async (sql: string, args: string[]) => {
    assert.match(sql, /^SELECT/); assert.deepEqual(args, ['qa-mueble-synthetic-run', 'QA-STOCK-synthetic-run']);
    return [[{ quantity_on_hand: 20, quantity_reserved: 17 }]];
  } } as unknown as Connection;
  assert.equal(await checkSuiteStock(db), 3);
  await assert.rejects(checkSuiteStock({ execute: async () => [[]] } as unknown as Connection), /ausente o ambiguo/);
});
test('preflight blocks and failed runs keep the prior complete success byte-for-byte', () => {
  const evidence = mkdtempSync(resolve(tmpdir(), 'hf-history-'));
  const folder = resolve(evidence, 'automated-business-journeys'); mkdirSync(folder);
  const report = '# Previous five PASS\n';
  writeFileSync(resolve(evidence, 'automated-business-journeys.md'), report);
  const results = JSON.stringify({ runId: 'legacy-success', status: 'passed', date: '2026-10-10',
    results: Array.from({ length: 5 }, () => ({ status: 'passed' })) });
  writeFileSync(resolve(folder, 'results.json'), results);
  writeFileSync(resolve(folder, 'capture.png'), 'original-image');
  preserveLastSuccess(evidence);
  const pointer = readFileSync(resolve(evidence, 'automated-business-journeys-last-success.json'), 'utf8');
  for (const [id, status] of [['attempt-a', 'blocked'], ['attempt-b', 'failed']]) writeRunStatus(evidence, id, status, 'Safe status');
  assert.equal(readFileSync(resolve(evidence, 'automated-business-journeys.md'), 'utf8'), report);
  assert.equal(readFileSync(resolve(folder, 'results.json'), 'utf8'), results);
  assert.equal(readFileSync(resolve(folder, 'capture.png'), 'utf8'), 'original-image');
  assert.equal(readFileSync(resolve(folder, 'report.md'), 'utf8'), report);
  assert.equal(readFileSync(resolve(evidence, 'automated-business-journeys-last-success.json'), 'utf8'), pointer);
  assert.equal(JSON.parse(readFileSync(resolve(folder, 'runs/attempt-a/status.json'), 'utf8')).status, 'blocked');
  assert.equal(JSON.parse(readFileSync(resolve(folder, 'runs/attempt-b/status.json'), 'utf8')).status, 'failed');
});


test('reporter archives success, failure and partial runs without overwriting the latest five PASS', () => {
  const evidence = mkdtempSync(resolve(tmpdir(), 'hf-reporter-'));
  process.env.E2E_RUN_ID = 'synthetic-catalog';
  function report(id: string, statuses: string[], status: string) {
    process.env.E2E_EXECUTION_ID = id;
    const reporter = new JourneyReporter(evidence); reporter.onBegin();
    statuses.forEach((testStatus, index) => reporter.onTestEnd({ title: `${index + 1} Synthetic`,
      location: { file: `synthetic-${index}.spec.ts` } } as TestCase,
    { status: testStatus, duration: 1, attachments: [], errors: [] } as unknown as TestResult));
    reporter.onEnd({ status } as FullResult);
  }
  report('first-success', Array(5).fill('passed'), 'passed');
  const initial = readFileSync(resolve(evidence, 'automated-business-journeys.md'), 'utf8');
  const pointer = readFileSync(resolve(evidence, 'automated-business-journeys-last-success.json'), 'utf8');
  report('later-failure', ['failed'], 'failed');
  report('later-partial', ['passed'], 'passed');
  assert.equal(readFileSync(resolve(evidence, 'automated-business-journeys.md'), 'utf8'), initial);
  assert.equal(readFileSync(resolve(evidence, 'automated-business-journeys-last-success.json'), 'utf8'), pointer);
  report('second-success', Array(5).fill('passed'), 'passed');
  assert.equal(JSON.parse(readFileSync(resolve(evidence, 'automated-business-journeys-last-success.json'), 'utf8')).executionId, 'second-success');
  for (const id of ['first-success', 'later-failure', 'later-partial', 'second-success']) {
    const reportFile = resolve(evidence, 'automated-business-journeys/runs', id, 'results.json');
    assert.equal(JSON.parse(readFileSync(reportFile, 'utf8')).executionId, id);
  }
});
