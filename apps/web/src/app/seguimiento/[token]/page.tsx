import { PublicOrderTrackingView, TrackingUnavailable } from '@/components/public-order-tracking';
import { getPublicOrderTracking } from '@/lib/public-order-tracking';

export const dynamic = 'force-dynamic';

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tracking = await getPublicOrderTracking(token);
  return tracking ? <PublicOrderTrackingView tracking={tracking} /> : <TrackingUnavailable />;
}
