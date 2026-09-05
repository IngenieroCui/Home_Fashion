import { workshopProgressApi, workshopProgressJson } from '@/lib/admin-workshop-progress';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return workshopProgressJson(
    await workshopProgressApi(request, `/admin/workshop-progress/${encodeURIComponent(id)}`)
  );
}
