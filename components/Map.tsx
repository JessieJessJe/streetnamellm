// components/Map.tsx
'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { StreetNameEntry } from '../types';

export type MapProps = {
    data: Array<StreetNameEntry>;
    isSearchActive: boolean;
};

export default function Map({ data, isSearchActive }: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markers = useRef<mapboxgl.Marker[]>([]);
    const clusterSourceId = 'street-names-cluster';

    useEffect(() => {
        if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN || !mapContainer.current) return;

        try {
            if (!map.current) {
                map.current = new mapboxgl.Map({
                    container: mapContainer.current,
                    accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
                    style: 'mapbox://styles/mapbox/light-v11',
                    center: [-74.006, 40.7128],
                    zoom: 11,
                    maxBounds: [[-74.3, 40.4], [-73.6, 40.9]]
                });

                // Wait for map style to load before adding sources and layers
                map.current.on('load', () => {
                    if (!map.current) return;

                    // Remove existing layers first
                    ['clusters', 'cluster-count', 'unclustered-points', 'search-results'].forEach(layerId => {
                        if (map.current?.getLayer(layerId)) {
                            map.current.removeLayer(layerId);
                        }
                    });

                    // Then remove existing source if it exists
                    if (map.current.getSource(clusterSourceId)) {
                        map.current.removeSource(clusterSourceId);
                    }

                    // Add source
                    map.current.addSource(clusterSourceId, {
                        type: 'geojson',
                        data: getGeoJsonData(data),
                        cluster: !isSearchActive,
                        clusterMaxZoom: 14,
                        clusterRadius: 50
                    });

                    // Add layers
                    if (isSearchActive) {
                        addSearchResults();
                    } else {
                        addClusterLayers();
                    }

                    updateMapVisibility();
                    fitToBounds(data);
                });
            }

            return () => {
                if (map.current) {
                    map.current.remove();
                    map.current = null;
                }
            };
        } catch (error) {
            console.error('Map initialization error:', error);
        }
    }, []);

    useEffect(() => {
        if (!map.current) return;

        // Wait for style to be fully loaded
        if (!map.current.isStyleLoaded()) {
            map.current.once('style.load', () => updateMapData());
            return;
        }

        updateMapData();
    }, [data, isSearchActive]);

    const updateMapData = () => {
        if (!map.current) return;

        try {
            // Remove existing layers first
            ['clusters', 'cluster-count', 'unclustered-points', 'search-results'].forEach(layerId => {
                if (map.current?.getLayer(layerId)) {
                    map.current.removeLayer(layerId);
                }
            });

            // Then remove and recreate the source
            if (map.current.getSource(clusterSourceId)) {
                map.current.removeSource(clusterSourceId);
            }

            map.current.addSource(clusterSourceId, {
                type: 'geojson',
                data: getGeoJsonData(data),
                cluster: !isSearchActive,
                clusterMaxZoom: 14,
                clusterRadius: 50
            });

            // Add appropriate layers
            if (isSearchActive) {
                // addSearchResults();
                addIndividualMarkers(data);
            } else {
                addClusterLayers();
            }

            fitToBounds(data);
        } catch (error) {
            console.error('Map update error:', error);
        }
    };

    const getGeoJsonData = (entries: StreetNameEntry[]): GeoJSON.FeatureCollection => ({
        type: 'FeatureCollection',
        features: entries
            .filter(entry => !!entry.geolocation)
            .map(entry => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [entry.geolocation!.longitude, entry.geolocation!.latitude]
                },
                properties: entry
            }))
    });

    const addClusterLayers = () => {
        if (!map.current) return;

        // Clear existing markers
        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        // Remove existing layer if it exists
        if (map.current.getLayer('search-results')) {
            map.current.removeLayer('search-results');
        }
        // Cluster circles
        map.current.addLayer({
            id: 'clusters',
            type: 'circle',
            source: clusterSourceId,
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    'rgba(200, 200, 200, 1)',
                    10,
                    'rgba(190, 195, 190, 1)',
                    30,
                    'rgba(180, 190, 180, 1)'
                ],
                'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 20, 40],
                'circle-blur': 0.6,
                'circle-opacity': 0.8,
                'circle-stroke-width': 1.5,
                'circle-stroke-color': [
                    'step',
                    ['get', 'point_count'],
                    'rgba(200, 200, 200, 0.3)',
                    10,
                    'rgba(190, 195, 190, 0.3)',
                    30,
                    'rgba(180, 190, 180, 0.3)'
                ]
            }
        });

        // Cluster labels
        map.current.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: clusterSourceId,
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
            }
        });

        // Individual points in cluster mode
        map.current.addLayer({
            id: 'unclustered-points',
            type: 'circle',
            source: clusterSourceId,
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': 'rgba(200, 200, 200, 1.0)',
                'circle-radius': 8,
                'circle-stroke-width': 2,
                'circle-stroke-color': 'rgba(10, 10, 10, 1)',
                'circle-opacity': 0.9
            }
        });

        // Click handler for cluster points
        map.current.on('click', 'unclustered-points', (e) => {
            if (!e.features || !map.current) return;
            const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates.slice();
            const entry = e.features[0].properties as StreetNameEntry;

            new mapboxgl.Popup()
                .setLngLat(coordinates as [number, number])
                .setHTML(createPopupContent(entry))
                .addTo(map.current);
        });
    };

    const addSearchResults = () => {
        if (!map.current) return;

        // Search results layer
        map.current.addLayer({
            id: 'search-results',
            type: 'circle',
            source: clusterSourceId,
            paint: {
                'circle-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'normalized_score'],
                    0, 'rgba(250, 250, 250, 1)',
                    1, 'rgba(34, 102, 0, 1)'
                ],
                'circle-radius': 8,
                'circle-blur': 0.1,
                'circle-stroke-width': 1,
                'circle-stroke-color': 'rgba(34, 102, 0, 1)',
                'circle-opacity': 0.8
            }
        });

        // Click handler for search results
        map.current.on('click', 'search-results', (e) => {
            if (!e.features || !map.current) return;
            const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates.slice();
            const properties = e.features[0].properties || {};

            new mapboxgl.Popup()
                .setLngLat(coordinates as [number, number])
                .setHTML(createPopupContent(properties as StreetNameEntry))
                .addTo(map.current);
        });
    };

    const addIndividualMarkers = (entries: StreetNameEntry[]) => {
        // Clear existing markers
        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        const getMarkerColor = (score: number) => {
            const cutoffScore = 0.3; // 70% as cutoff point

            if (score >= cutoffScore) {
                return 'rgba(34, 102, 0, 1)'; // Pure green for high scores
            }

            const startColor = { r: 128, g: 128, b: 128 }; // Gray
            const endColor = { r: 34, g: 102, b: 0 };      // Green

            const r = Math.round(startColor.r + (endColor.r - startColor.r) * score);
            const g = Math.round(startColor.g + (endColor.g - startColor.g) * score);
            const b = Math.round(startColor.b + (endColor.b - startColor.b) * score);
            const opacity = 0.5 + (score * 0.5);

            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        };

        entries.forEach(entry => {
            if (!entry.geolocation) return;

            const marker = new mapboxgl.Marker({
                color: getMarkerColor(entry.score || 0),
                scale: 0.8
            })
                .setLngLat([entry.geolocation.longitude, entry.geolocation.latitude])
                .setPopup(new mapboxgl.Popup().setHTML(createPopupContent(entry)));

            if (map.current) marker.addTo(map.current);
            markers.current.push(marker);
        });
    };

    const updateMapVisibility = () => {
        if (!map.current) return;
        const visibility = isSearchActive ? 'none' : 'visible';
        ['clusters', 'cluster-count', 'unclustered-points'].forEach(layer => {
            if (map.current?.getLayer(layer)) {
                map.current.setLayoutProperty(layer, 'visibility', visibility);
            }
        });
    };

    const createPopupContent = (entry: StreetNameEntry) => `
        <div class="max-w-[300px] md:max-w-[500px]">
            <div class="max-h-[200px] md:max-h-[400px] overflow-y-auto px-3 py-2">
                <h3 class="font-semibold text-base mb-2 text-gray-900">${entry.honorary_name}</h3>
                <div class="mt-2 text-sm text-gray-500 py-2">
                    <p>${entry.limits || ''}</p>
                </div>
                <p class="text-sm text-gray-600 whitespace-pre-wrap">${entry.bio || 'No summary available'}</p>
            </div>
        </div>
    `;

    const fitToBounds = (entries: StreetNameEntry[]) => {
        if (!map.current || entries.length === 0) return;

        // If search is active, find the highest scoring entries
        if (isSearchActive) {
            const maxScore = Math.max(...entries.map(entry => entry.score || 0));
            const highestScoringEntries = entries.filter(entry =>
                (entry.score || 0) >= maxScore * 0.5  // Get entries within 90% of max score
            );

            const bounds = new mapboxgl.LngLatBounds();
            highestScoringEntries.forEach(entry => {
                if (entry.geolocation) {
                    bounds.extend([entry.geolocation.longitude, entry.geolocation.latitude]);
                }
            });

            if (!bounds.isEmpty()) {
                map.current.fitBounds(bounds, {
                    padding: 100,  // Increased padding for better context
                    maxZoom: 14,
                    duration: 2000
                });
            }
        } else {
            // For non-search view, fit to all entries
            const bounds = new mapboxgl.LngLatBounds();
            entries.forEach(entry => {
                if (entry.geolocation) {
                    bounds.extend([entry.geolocation.longitude, entry.geolocation.latitude]);
                }
            });

            if (!bounds.isEmpty()) {
                map.current.fitBounds(bounds, {
                    padding: 40,
                    maxZoom: 11,
                    duration: 2000
                });
            }
        }
    };

    return (
        <div
            ref={mapContainer}
            className="w-full h-[400px] lg:h-full lg:w-full rounded-xl shadow-lg border border-gray-200 
            dark:border-gray-700 dark:shadow-gray-900"
        />
    );
}