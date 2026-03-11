import { NetworkError } from './errors.js';
import type {
  GatewayClientConfig,
  SubmitIntentRequest,
  SubmitIntentResponse,
  IntentStatusResponse,
  BatchListItem,
} from './types.js';

export class GatewayClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeoutMs: number;
  private maxRetries: number;
  private retryBaseDelayMs: number;
  private retryMaxDelayMs: number;
  private retryJitterMs: number;

  constructor(config: GatewayClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.headers = { 'Content-Type': 'application/json' };
    if (config.apiKeyHeader && config.apiKey) {
      this.headers[config.apiKeyHeader] = config.apiKey;
    }
    this.timeoutMs = config.timeoutMs ?? 10_000;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBaseDelayMs = config.retryBaseDelayMs ?? 200;
    this.retryMaxDelayMs = config.retryMaxDelayMs ?? 5_000;
    this.retryJitterMs = config.retryJitterMs ?? 100;
  }

  async getGatewayPublicKey(): Promise<{ gateway_public_key: string }> {
    return this.request<{ gateway_public_key: string }>('GET', '/v1/public-key');
  }

  async submitIntent(body: SubmitIntentRequest): Promise<SubmitIntentResponse> {
    return this.request<SubmitIntentResponse>('POST', '/v1/intents', body);
  }

  async getIntentStatus(intentId: string): Promise<IntentStatusResponse> {
    return this.request<IntentStatusResponse>('GET', `/v1/intents/${intentId}`);
  }

  async listIntents(params?: {
    userAddress?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ intents: IntentStatusResponse[] }> {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return this.request<{ intents: IntentStatusResponse[] }>('GET', `/v1/intents${qs}`);
  }

  async reconcileOnchainIntent(intentId: string, body: {
    action: 'COMMITTED' | 'CANCELED';
    user_address: string;
    tx_hash: string;
  }): Promise<void> {
    await this.request<void>('POST', `/v1/intents/${intentId}/onchain`, body);
  }

  async listBatches(params?: { limit?: number; offset?: number }): Promise<{ batches: BatchListItem[] }> {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString() : '';
    return this.request<{ batches: BatchListItem[] }>('GET', `/v1/batches${qs}`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let attempt = 0;
    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: this.headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          if (res.status === 204) return undefined as T;
          return res.json() as T;
        }
        const isRetryable = res.status === 429 || res.status >= 500;
        if (isRetryable && attempt < this.maxRetries) {
          await this.sleep(attempt);
          attempt++;
          continue;
        }
        const text = await res.text().catch(() => '');
        throw new NetworkError(`Gateway ${res.status}: ${text}`, res.status);
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof NetworkError) throw err;
        if (attempt < this.maxRetries) {
          await this.sleep(attempt);
          attempt++;
          continue;
        }
        throw new NetworkError(String(err), 0);
      }
    }
  }

  private sleep(attempt: number): Promise<void> {
    const delay = Math.min(
      this.retryBaseDelayMs * 2 ** attempt + Math.random() * this.retryJitterMs,
      this.retryMaxDelayMs
    );
    return new Promise((r) => setTimeout(r, delay));
  }
}
