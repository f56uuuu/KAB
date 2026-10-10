'use client';

import { TrackJob } from '@/components/TrackJob';

export default function Page({ params }: { params: { id: string } }) {
  return <TrackJob kind="ride" id={params.id} />;
}
