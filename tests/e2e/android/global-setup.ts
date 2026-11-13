import { isolatedDatabase } from '../fixtures/database';
import { apiURL, loadEnvironment, webURL } from '../support/environment';

export default async function globalSetup() {
  loadEnvironment();
  const guard = await isolatedDatabase(); await guard.end();
  for (const url of [`${apiURL}/health`, `${webURL}/catalogo`]) {
    const response = await fetch(url).catch(() => null);
    if (!response?.ok) throw new Error(`BLOQUEADO: ${url} no responde; inicia los servicios E2E aislados.`);
  }
}
