import { NetworkError, ValidationError } from './errors';
import {
  SubmitIntentRequest,
  SubmitIntentResponse,
  GatewayPublicKeyResponse,
  IntentStatusResponse,
  IntentListResponse,
  BatchListResponse,
  BatchIntentListResponse
} from './types';

export type GatewayClientConfig = {
  baseUrl: string;
  apiKeyHeader: string;
  apiKey: string;
  timeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  retryJitterMs: number;
};

export class GatewayClient {
  private baseUrl: string;
  private apiKeyHeader: string;
  private apiKey: string;
  private timeoutMs: number;
  private maxRetries: number;
  private retryBaseDelayMs: number;
  private retryMaxDelayMs: number;
  private retryJitterMs: number;

  constructor(config: GatewayClientConfig) {
    if (!config.baseUrl || !config.baseUrl.startsWith('http')) {
      throw new ValidationError('baseUrl must start with http');
    }
    if (!config.apiKeyHeader) {
      throw new ValidationError('apiKeyHeader is required');
    }
    if (!config.apiKey) {
      throw new ValidationError('apiKey is required');
    }
    if (!config.timeoutMs || config.timeoutMs <= 0) {
      throw new ValidationError('timeoutMs must be greater than 0');
    }
    if (config.retryBaseDelayMs <= 0) {
      throw new ValidationError('retryBaseDelayMs must be greater than 0');
    }
    if (config.retryMaxDelayMs <= 0) {
      throw new ValidationError('retryMaxDelayMs must be greater than 0');
    }
    this.baseUrl = config.baseUrl;
    this.apiKeyHeader = config.apiKeyHeader;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs;
    this.maxRetries = config.maxRetries;
    this.retryBaseDelayMs = config.retryBaseDelayMs;
    this.retryMaxDelayMs = config.retryMaxDelayMs;
    this.retryJitterMs = config.retryJitterMs;
  }

  async submitIntent(request: SubmitIntentRequest): Promise<SubmitIntentResponse> {
    return this.request<SubmitIntentResponse>('/v1/intents', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getIntentStatus(intentId: string): Promise<IntentStatusResponse> {
    return this.request<IntentStatusResponse>(`/v1/intents/${intentId}`, { method: 'GET' });
  }

  async cancelIntent(intentId: string, userAddress: string, signature: string[]): Promise<void> {
    await this.request<{ status?: string }>(`/v1/intents/${intentId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({
        user_address: userAddress,
        signature
      })
    });
  }

  async listIntents(params: {
    userAddress?: string;
    status?: string;
    batchId?: string;
    limit?: number;
    offset?: number;
  }): Promise<IntentListResponse> {
    const query = new URLSearchParams();
    if (params.userAddress) {
      query.set('user_address', params.userAddress);
    }
    if (params.status) {
      query.set('status', params.status);
    }
    if (params.batchId) {
      query.set('batch_id', params.batchId);
    }
    if (params.limit !== undefined) {
      query.set('limit', params.limit.toString());
    }
    if (params.offset !== undefined) {
      query.set('offset', params.offset.toString());
    }
    const path = `/v1/intents${query.toString() ? `?${query.toString()}` : ''}`;
    return this.request<IntentListResponse>(path, { method: 'GET' });
  }

  async listBatches(params: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<BatchListResponse> {
    const query = new URLSearchParams();
    if (params.status) {
      query.set('status', params.status);
    }
    if (params.limit !== undefined) {
      query.set('limit', params.limit.toString());
    }
    if (params.offset !== undefined) {
      query.set('offset', params.offset.toString());
    }
    const path = `/v1/batches${query.toString() ? `?${query.toString()}` : ''}`;
    return this.request<BatchListResponse>(path, { method: 'GET' });
  }

  async listBatchIntents(batchId: string, params?: { limit?: number; offset?: number }): Promise<BatchIntentListResponse> {
    if (!batchId) {
      throw new ValidationError('batchId is required');
    }
    const query = new URLSearchParams();
    if (params?.limit !== undefined) {
      query.set('limit', params.limit.toString());
    }
    if (params?.offset !== undefined) {
      query.set('offset', params.offset.toString());
    }
    const path = `/v1/batches/${batchId}/intents${query.toString() ? `?${query.toString()}` : ''}`;
    return this.request<BatchIntentListResponse>(path, { method: 'GET' });
  }

  async getGatewayPublicKey(): Promise<GatewayPublicKeyResponse> {
    return this.request<GatewayPublicKeyResponse>('/v1/gateway/public_key', { method: 'GET' });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.requestWithRetry(path, init);
    return (await response.json()) as T;
  }

  private async requestWithRetry(path: string, init: RequestInit): Promise<Response> {
    let attempt = 0;
    while (true) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            [this.apiKeyHeader]: this.apiKey,
            ...(init.headers || {}),
          },
          signal: controller.signal,
        });

        if (response.ok) {
          return response;
        }

        if (this.isRetryableStatus(response.status) && attempt < this.maxRetries) {
          const delay = this.computeBackoff(attempt);
          attempt += 1;
          await this.sleep(delay);
          continue;
        }

        const body = await response.text();
        throw new NetworkError(`Gateway error: ${response.status} ${body}`);
      } catch (error) {
        if (error instanceof NetworkError) {
          throw error;
        }
        if (attempt < this.maxRetries) {
          const delay = this.computeBackoff(attempt);
          attempt += 1;
          await this.sleep(delay);
          continue;
        }
        throw new NetworkError(`Request failed: ${String(error)}`);
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  private isRetryableStatus(status: number): boolean {
    return status === 429 || status >= 500;
  }

  private computeBackoff(attempt: number): number {
    const base = this.retryBaseDelayMs * Math.pow(2, attempt);
    const capped = Math.min(base, this.retryMaxDelayMs);
    const jitter = this.retryJitterMs > 0 ? Math.floor(Math.random() * (this.retryJitterMs + 1)) : 0;
    return capped + jitter;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
