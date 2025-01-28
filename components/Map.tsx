// components/Map.tsx
'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { StreetNameEntry } from '../types';

export type MapProps = {
    data: Array<StreetNameEntry>;
};

export default function Map({ data }: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markers = useRef<mapboxgl.Marker[]>([]);

    useEffect(() => {
        // Validate Mapbox token
        if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
            console.error('Mapbox token is missing');
            return;
        }

        if (!mapContainer.current) return;

        try {
            // Initialize map only once
            if (!map.current) {
                map.current = new mapboxgl.Map({
                    container: mapContainer.current,
                    accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
                    style: 'mapbox://styles/mapbox/light-v11',
                    center: [-74.006, 40.7128],
                    zoom: 11,
                    maxBounds: [[-74.3, 40.4], [-73.6, 40.9]] // Restrict to NYC area
                });

                map.current.on('load', () => {
                    if (map.current) addMarkers();
                });
            } else {
                addMarkers();
            }
        } catch (error) {
            console.error('Error initializing map:', error);
        }

        function addMarkers() {
            if (!map.current) return;

            try {
                // Clear existing markers
                markers.current.forEach(marker => marker.remove());
                markers.current = [];

                // Add new markers
                data.forEach(entry => {
                    if (!entry.lat || !entry.lng) return; // Skip invalid coordinates

                    const popup = new mapboxgl.Popup({ offset: 25 })
                        .setHTML(`
                            <div class="max-w-[300px]">
                                <h3 class="font-semibold text-base mb-2">${entry.coname}</h3>
                                <p class="text-sm text-gray-600">${entry.reason || 'No summary available'}</p>
                                <div class="mt-2 text-xs text-gray-500">
                                    <p>📍 ${entry.year || 'Year unknown'}</p>
                                </div>
                            </div>
                        `);

                    const marker = new mapboxgl.Marker({
                        color: '#3b82f6',
                        scale: 0.8
                    })
                        .setLngLat([entry.lng, entry.lat])
                        .setPopup(popup)
                        .addTo(map.current!); // Type assertion to ensure map.current is not null

                    markers.current.push(marker);
                });
            } catch (error) {
                console.error('Error adding markers:', error);
            }
        }

        return () => {
            try {
                markers.current.forEach(marker => marker.remove());
                if (map.current) {
                    map.current.remove();
                    map.current = null;
                }
            } catch (error) {
                console.error('Error cleaning up map:', error);
            }
        };
    }, [data]);

    return (
        <div
            ref={mapContainer}
            className="w-full h-[400px] lg:h-full lg:w-full rounded-xl shadow-lg border border-gray-200 
          dark:border-gray-700 dark:shadow-gray-900"
        />
    );
}