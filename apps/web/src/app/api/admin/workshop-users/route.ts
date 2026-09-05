import { workshopJobsApi, workshopJobsJson } from '@/lib/admin-workshop-jobs';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return workshopJobsJson(
    await workshopJobsApi(request, `/admin/workshop-users${query ? `?${query}` : ''}`)
  );
}
