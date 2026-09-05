import { workshopProgressApi, workshopProgressJson } from '@/lib/admin-workshop-progress';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return workshopProgressJson(
    await workshopProgressApi(request, `/admin/workshop-progress${query ? `?${query}` : ''}`)
  );
}
