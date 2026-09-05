import { workshopProgressApi, workshopProgressJson } from '@/lib/admin-workshop-progress';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const input = (await request.json().catch(() => null)) as {
    decision?: unknown;
    comment?: unknown;
  } | null;
  const body =
    input && typeof input === 'object'
      ? {
          decision: input.decision,
          ...(typeof input.comment === 'string' ? { comment: input.comment } : {})
        }
      : null;
  return workshopProgressJson(
    await workshopProgressApi(
      request,
      `/admin/workshop-progress/${encodeURIComponent(id)}/review`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      }
    )
  );
}
