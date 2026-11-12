import type { Reporter, TestCase, TestResult, FullResult, TestStep } from '@playwright/test/reporter';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, required } from './environment';
import { newExecutionId, preserveLastSuccess, writeRunStatus } from './history';

function redact(value: string) {
  for (const [key, secret] of Object.entries(process.env)) {
    if (/PASSWORD|SECRET|MARKER|CLOUDINARY_API_KEY/.test(key) && secret) value = value.split(secret).join('[redacted]');
  }
  return value.replace(/\u001b\[[0-9;]*m/g, '').replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jwt]')
    .replace(/(\/seguimiento\/|\/public\/tracking\/)[\w-]+/g, '$1[redacted]')
    .replace(/hf_(access|refresh)_token[^\s,;]*/g, '[cookie]');
}
export default class JourneyReporter implements Reporter {
  private results: Record<string, unknown>[] = [];
  private steps = new Map<string, unknown[]>();
  private evidence = resolve(root, 'docs/thesis/evidence');
  private executionId = process.env.E2E_EXECUTION_ID ?? newExecutionId();
  private folder = resolve(this.evidence, 'automated-business-journeys/runs', this.executionId);
  private readonly expectedScenarios: number;
  constructor(options?: { evidence?: string; expectedScenarios?: number }) {
    this.expectedScenarios = options?.expectedScenarios ?? 6;
    const evidence = options?.evidence;
    if (evidence) {
      this.evidence = evidence;
      this.folder = resolve(evidence, 'automated-business-journeys/runs', this.executionId);
    }
  }
  onBegin() { preserveLastSuccess(this.evidence); mkdirSync(this.folder, { recursive: true }); console.log('Journeys reales: Next.js + NestJS + MySQL E2E; reintentos automáticos desactivados.'); }
  onStepEnd(test: TestCase, _result: TestResult, step: TestStep) {
    if (step.category !== 'test.step') return;
    const entries = this.steps.get(test.id) ?? [];
    entries.push({ operation: redact(step.title), durationMs: step.duration, ...(step.error ? { error: redact(step.error.message ?? 'Error') } : {}) });
    this.steps.set(test.id, entries);
    console.log(`  ${step.error ? 'FAIL' : 'OK'}: ${redact(step.title)}`);
  }
  onTestEnd(test: TestCase, result: TestResult) {
    let evidence: Record<string, unknown> = {};
    const attachment = result.attachments.find(item => item.name === 'journey-evidence');
    if (attachment) evidence = JSON.parse((attachment.body ?? readFileSync(attachment.path!)).toString());
    for (const item of result.attachments.filter(item => item.path && /error-context\.md$/.test(item.path))) {
      writeFileSync(item.path!, redact(readFileSync(item.path!, 'utf8')));
    }
    const screenshots: string[] = [];
    for (const item of result.attachments.filter(item => item.contentType === 'image/png')) {
      const filename = `${test.location.file.split(/[\\/]/).pop()?.replace('.spec.ts', '')}-${item.name}.png`;
      copyFileSync(item.path!, resolve(this.folder, filename)); screenshots.push(filename);
    }
    const entry = { scenario: test.title, status: result.status, durationMs: result.duration, ...evidence, screenshots,
      errors: result.errors.map(error => redact(error.message ?? 'Error')) };
    this.results.push(entry);
    const failurePath = resolve(this.folder, `${test.location.file.split(/[\\/]/).pop()}.failure-trace.json`);
    if (result.status === 'passed' && existsSync(failurePath)) unlinkSync(failurePath);
    if (result.status !== 'passed') writeFileSync(failurePath,
      JSON.stringify({ scenario: test.title, steps: this.steps.get(test.id) ?? [], errors: entry.errors }, null, 2));
    console.log(`${result.status.toUpperCase()} ${test.title} (${(result.duration / 1000).toFixed(1)}s)`);
    for (const error of entry.errors) console.log(error.slice(0, 5000));
  }
  onError(error: { message?: string }) { console.error(redact(error.message ?? 'Error del runner')); }
  onEnd(result: FullResult) {
    const cloudinaryVerified = process.env.HF_E2E_ISOLATED_CLOUDINARY === 'true' && this.results.some(entry => String(entry.scenario).startsWith('01') && entry.status === 'passed');
    const report = { executionId: this.executionId, runId: required('E2E_RUN_ID'), date: new Date().toISOString(), status: result.status,
      stack: { browser: 'Chromium real', api: 'NestJS real', database: 'MySQL aislado, UUID y privilegios verificados',
        cloudinary: cloudinaryVerified ? 'REAL: multipart de taller y entrega en carpeta E2E; URLs persistidas en MySQL'
          : process.env.CLOUDINARY_API_SECRET ? 'NO VERIFICADO: credenciales configuradas; journey asistido no completado' : 'CONTROLADO: respuestas del proveedor simuladas en el proceso de pruebas; sin acceso externo',
        android: 'PENDIENTE: no ejecutado en dispositivo' }, results: this.results };
    writeFileSync(resolve(this.folder, 'results.json'), JSON.stringify(report, null, 2));
    const lines = ['# Automated business journeys', '', `Ejecución: ${report.executionId}. Catálogo: ${report.runId}. Fecha UTC: ${report.date}. Resultado: ${result.status}.`, '',
      'Suite permanente sobre los cambios locales actuales de Home Fashion. Ninguna escritura contra Aiven. Sin DROP/TRUNCATE/reset.', '',
      '| Escenario | Resultado | Duración |', '| --- | --- | --- |',
      ...this.results.map(entry => `| ${entry.scenario} | ${entry.status === 'passed' ? 'PASS' : String(entry.status).toUpperCase()} | ${(Number(entry.durationMs) / 1000).toFixed(1)} s |`), '',
      '## Integración y límites', '',
      '- Cliente y operaciones principales ADMIN en Chromium real contra Next.js y NestJS.',
      '- WORKSHOP usa autenticación y operaciones API reales; esto no demuestra ejecución móvil.',
      '- MySQL local dedicado: host, puerto, nombre, UUID, marcador y SHOW GRANTS verificados antes de migrar/sembrar y al abrir cada fixture.',
      `- Cloudinary: ${report.stack.cloudinary}. Los happy paths no interceptan respuestas.`,
      '- Android runtime PENDIENTE. No se instaló Android SDK.',
      '- Solo recuperación introduce fallos de red después de recibir respuestas reales; no fabrica éxitos.',
      '- No se guardan storageState, cookies, contraseñas ni tokens. Las trazas de error son trazas semánticas JSON de test.step, sin tráfico HTTP; las trazas ZIP de Playwright se desactivan porque capturan secretos.',
      `- Datos y capturas de esta ejecución en automated-business-journeys/runs/${this.executionId}/results.json y archivos adjuntos.`, '',
      '## Datos enlazados y estados MySQL', '',
      ...this.results.flatMap(entry => [`### ${entry.scenario}`, '', '```json', JSON.stringify({ actors: entry.actors, modules: entry.modules, ids: entry.ids, finalMySQL: entry.finalMySQL, notes: entry.notes }, null, 2), '```', '',
        ...(entry.errors as string[]).length ? ['Error real:', '```text', ...(entry.errors as string[]), '```', ''] : []])];
    const markdown = lines.join('\n') + '\n';
    writeFileSync(resolve(this.folder, 'report.md'), markdown);
    const completeSuccess = result.status === 'passed' && this.results.length === this.expectedScenarios
      && this.results.every(entry => entry.status === 'passed');
    writeRunStatus(this.evidence, this.executionId, completeSuccess ? 'passed' : result.status === 'passed' ? 'partial' : result.status,
      `${this.results.filter(entry => entry.status === 'passed').length}/${this.results.length} escenarios PASS; suite completa: ${completeSuccess}.`);
    if (completeSuccess && (this.expectedScenarios === 5 || cloudinaryVerified)) {
      writeFileSync(resolve(this.evidence, 'automated-business-journeys.md'), markdown);
      writeFileSync(resolve(this.evidence, 'automated-business-journeys-last-success.json'), JSON.stringify({
        executionId: this.executionId, runId: report.runId, date: report.date, passed: this.results.length,
        results: `automated-business-journeys/runs/${this.executionId}/results.json`,
        report: `automated-business-journeys/runs/${this.executionId}/report.md`
      }, null, 2) + '\n');
    }
  }
}
