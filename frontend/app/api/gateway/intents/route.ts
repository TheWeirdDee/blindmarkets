import { NextResponse } from 'next/server';
import { gatewayFetch, getGatewayEnv } from '../_client';

export async function GET(request: Request) {
  const env = getGatewayEnv();
  if (env instanceof NextResponse) {
    return env;
  }

  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get('user_address');
  const status = searchParams.get('status');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');

  const query = new URLSearchParams();
  if (userAddress) {
    query.set('user_address', userAddress);
  }
  if (status) {
    query.set('status', status);
  }
  if (limit) {
    query.set('limit', limit);
  }
  if (offset) {
    query.set('offset', offset);
  }

  const path = `/v1/intents${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await gatewayFetch(path);
  const body = await response.text();
  const parsed = safeJson(body);

  return NextResponse.json(
    response.ok ? parsed : { error: parsed.error || body || 'Gateway error' },
    { status: response.status }
  );
}

export async function POST(request: Request) {
  const env = getGatewayEnv();
  if (env instanceof NextResponse) {
    return env;
  }

  const body = await request.text();
  const response = await gatewayFetch('/v1/intents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const responseBody = await response.text();
  const parsed = safeJson(responseBody);

  return NextResponse.json(
    response.ok ? parsed : { error: parsed.error || responseBody || 'Gateway error' },
    { status: response.status }
  );
}

function safeJson(body: string): Record<string, unknown> {
  if (!body) {
    return {};
  }
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return { error: body };
  }
}
