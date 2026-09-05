import { apiServerUrl } from '@/lib/auth/server';
import { PublicBodyTooLargeError, readPublicJsonBody } from '@/lib/public-json-body';
import { publicQuoteRequestMessage } from '@/lib/public-quote-requests';
import { NextRequest, NextResponse } from 'next/server';

const MAX_BODY_BYTES = 32_768;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await readPublicJsonBody(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof PublicBodyTooLargeError) {
      return NextResponse.json({ message: publicQuoteRequestMessage(413) }, { status: 413 });
    }
    return NextResponse.json({ message: publicQuoteRequestMessage(400) }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ message: publicQuoteRequestMessage(400) }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`${apiServerUrl()}/public/quote-requests`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    return NextResponse.json({ message: publicQuoteRequestMessage(503) }, { status: 503 });
  }

  const responseBody = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    return NextResponse.json(
      { message: publicQuoteRequestMessage(response.status) },
      { status: response.status }
    );
  }
  const result = responseBody as { received?: unknown; requestCode?: unknown; status?: unknown };
  if (
    !result ||
    result.received !== true ||
    typeof result.requestCode !== 'string' ||
    result.status !== 'REQUESTED'
  ) {
    return NextResponse.json({ message: publicQuoteRequestMessage(502) }, { status: 502 });
  }
  return NextResponse.json(
    { received: true, requestCode: result.requestCode, status: 'REQUESTED' },
    { status: 201 }
  );
}
