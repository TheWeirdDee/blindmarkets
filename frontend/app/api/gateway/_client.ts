import { NextResponse } from 'next/server';

export type GatewayEnv = {
  url: string;
  apiKeyHeader: string;
  apiKey: string;
};

export function getGatewayEnv(): GatewayEnv | NextResponse {
  const url = process.env.GATEWAY_URL;
  const apiKeyHeader = process.env.GATEWAY_API_KEY_HEADER;
  const apiKey = process.env.GATEWAY_API_KEY;

  if (!url || !apiKeyHeader || !apiKey) {
    return NextResponse.json(
      { error: 'Gateway configuration missing' },
      { status: 500 }
    );
  }

  return { url, apiKeyHeader, apiKey };
}

export async function gatewayFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const env = getGatewayEnv();
  if (env instanceof NextResponse) {
    return env as unknown as Response;
  }

  const headers = new Headers(init.headers);
  headers.set(env.apiKeyHeader, env.apiKey);

  const url = `${env.url}${path}`;
  return fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
  });
}
