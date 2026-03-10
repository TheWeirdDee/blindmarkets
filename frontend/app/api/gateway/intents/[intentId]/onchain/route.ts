import { NextResponse } from 'next/server';
import { gatewayFetch, getGatewayEnv } from '../../../_client';

export async function POST(
  request: Request,
  context: { params: { intentId: string } }
) {
  const env = getGatewayEnv();
  if (env instanceof NextResponse) {
    return env;
  }

  const intentId = context.params.intentId;
  const body = await request.text();
  const response = await gatewayFetch(`/v1/intents/${intentId}/onchain`, {
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
