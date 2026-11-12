import type { APIRequestContext } from '@playwright/test';
import { actors } from '../fixtures/actors';
import { apiURL, required } from './environment';
import { validTestPng } from '../fixtures/image';

export type Entity = Record<string, any>;
export const testImage = {
  name: 'qa-e2e.png', mimeType: 'image/png',
  buffer: validTestPng
};
export class ApiClient {
  private token = '';
  constructor(private readonly request: APIRequestContext) {}
  async login(actor: keyof typeof actors) {
    const response = await this.request.post(`${apiURL}/auth/login`, { data: { email: actors[actor].email, password: required('E2E_ACTOR_PASSWORD') } });
    if (!response.ok()) throw new Error(`Login API ${actor}: HTTP ${response.status()}`);
    const result = await response.json(); this.token = result.accessToken;
    return result.user as Entity;
  }
  async response(method: 'GET' | 'POST', path: string, data?: unknown, multipart?: Record<string, any>) {
    if (!path.startsWith('/') || path.includes('://')) throw new Error('Ruta API E2E inválida');
    return this.request.fetch(`${apiURL}${path}`, { method, headers: this.token ? { authorization: `Bearer ${this.token}` } : {},
      ...(multipart ? { multipart } : data === undefined ? {} : { data }), maxRetries: 0 });
  }
  async call<T = Entity>(method: 'GET' | 'POST', path: string, data?: unknown, multipart?: Record<string, any>): Promise<T> {
    const response = await this.response(method, path, data, multipart);
    if (!response.ok()) throw new Error(`${method} ${path}: HTTP ${response.status()}`);
    return response.json() as Promise<T>;
  }
}
