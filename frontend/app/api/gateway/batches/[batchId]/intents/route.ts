import { NextResponse } from 'next/server';
import { gatewayFetch, getGatewayEnv } from '../../../_client';

export async function GET(
  _request: Request,
  context: { params: { batchId: string } }
) {
  const env = getGatewayEnv();
  if (env instanceof NextResponse) {
    return env;
  }

  const batchId = context.params.batchId;
  const response = await gatewayFetch(`/v1/batches/${batchId}/intents`);
  const body = await response.text();
  const parsed = safeJson(body);

  return NextResponse.json(
    response.ok ? parsed : { error: parsed.error || body || 'Gateway error' },
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
