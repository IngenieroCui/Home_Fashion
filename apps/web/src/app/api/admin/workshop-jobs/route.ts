import { workshopJobsApi, workshopJobsJson } from '@/lib/admin-workshop-jobs';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return workshopJobsJson(
    await workshopJobsApi(request, `/admin/workshop-jobs${query ? `?${query}` : ''}`)
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return workshopJobsJson(
    await workshopJobsApi(request, '/admin/workshop-jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  );
}
