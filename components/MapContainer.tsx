'use client';

import dynamic from 'next/dynamic';
import type { MapProps } from '@/components/Map';

const Map = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div className="h-[600px] bg-gray-50 rounded-xl animate-pulse" />
});

interface MapContainerProps extends MapProps { }

export default function MapContainer(props: MapContainerProps) {
    return <Map {...props} />;
}