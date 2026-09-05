import { apiServerUrl } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  const q = request.nextUrl.searchParams.get('q');
  if (q) params.set('q', q);
  const page = request.nextUrl.searchParams.get('page');
  const limit = request.nextUrl.searchParams.get('limit');
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  try {
    const response = await fetch(`${apiServerUrl()}/catalog/products?${params.toString()}`, {
      cache: 'no-store'
    });
    const body = await response.json().catch(() => null);
    return NextResponse.json(response.ok ? body : { message: 'No fue posible cargar productos.' }, {
      status: response.ok ? 200 : response.status
    });
  } catch {
    return NextResponse.json({ message: 'El servicio no está disponible.' }, { status: 503 });
  }
}
