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
                // Add this helper function to determine color based on score
                const getMarkerColor = (score: number) => {
                    // Assuming score is between 0 and 1
                    // You can adjust these colors and opacity values as needed
                    const baseColor = '#3b82f6'; // blue
                    const opacity = 0.3 + (score * 0.7); // opacity between 0.3 and 1.0

                    // Convert hex to rgba
                    const r = parseInt(baseColor.slice(1, 3), 16);
                    const g = parseInt(baseColor.slice(3, 5), 16);
                    const b = parseInt(baseColor.slice(5, 7), 16);

                    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                };

                // Clear existing markers
                markers.current.forEach(marker => marker.remove());
                markers.current = [];

                data.forEach(entry => {
                    if (!entry.geolocation) return;

                    const { longitude, latitude } = entry.geolocation;

                    // Use the score to determine marker color
                    const markerColor = getMarkerColor(entry.score || 0);

                    const popup = new mapboxgl.Popup({ offset: 25 })
                        .setHTML(`
                            <div class="max-w-[300px] md:max-w-[500px]">
                                <div class="max-h-[200px] md:max-h-[400px] overflow-y-auto px-3 py-2">
                                    <h3 class="font-semibold text-base mb-2 text-gray-900">${entry.honorary_name}</h3>
                                    <div class="mt-2 text-sm text-gray-500 py-2">
                                        <p>${entry.limits || ''}</p>
                                    </div>
                                    <p class="text-sm text-gray-600 whitespace-pre-wrap">${entry.bio || 'No summary available'}</p>
                                </div>
                            </div>
                        `);

                    const marker = new mapboxgl.Marker({
                        color: markerColor,
                        scale: 0.8,
                    })
                        .setLngLat([longitude, latitude])
                        .setPopup(popup)
                        .addTo(map.current!);

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