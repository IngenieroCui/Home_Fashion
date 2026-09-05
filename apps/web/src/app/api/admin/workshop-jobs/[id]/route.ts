import { workshopJobsApi, workshopJobsJson } from '@/lib/admin-workshop-jobs';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return workshopJobsJson(
    await workshopJobsApi(request, `/admin/workshop-jobs/${encodeURIComponent(id)}`)
  );
}
