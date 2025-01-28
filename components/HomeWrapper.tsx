'use client';

import { useState, Suspense, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Search } from './Search';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { StreetNameEntry, SearchState } from '../types';

const Map = dynamic(() => import('./Map'), {
    ssr: false,
    loading: () => <div className="h-[600px] bg-gray-50 rounded-xl animate-pulse" />
});

export default function HomeWrapper({ allData }: { allData: StreetNameEntry[] }) {
    const [searchState, setSearchState] = useState<SearchState>({
        originalData: allData,
        currentData: allData,
    });

    const handleNewSearch = (filteredEntries: StreetNameEntry[]) => {
        setSearchState(prev => ({
            ...prev,
            currentData: filteredEntries,
        }));
    };

    const resetSearch = () => {
        setSearchState({
            originalData: allData,
            currentData: allData,
        });
    };

    const plates = [0, 1, 2, 3, 4, 5].map(i => ({
        id: i,
        url: `https://raw.githubusercontent.com/JessieJessJe/nyc-conaming/main/src/images/plate${i}.png`
    }));

    const ratio = [0.1, 0.17, 0.2, 0.28, 0.22, 0.18];
    const offsetX = [0.5, 0.3, 0.1, 0.0, -0.25, -0.3];
    const offsetY = [-0.4, 0, 0, 0, 0.09, 0.08];

    const LandingPlates = () => {
        const [containerWidth, setContainerWidth] = useState(0);
        const containerRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const observer = new ResizeObserver((entries) => {
                const [entry] = entries;
                if (entry) {
                    setContainerWidth(entry.contentRect.width);
                }
            });

            if (containerRef.current) {
                observer.observe(containerRef.current);
            }

            return () => observer.disconnect();
        }, []);

        return (
            <div className="relative w-full h-full" ref={containerRef}>
                <div className="flex flex-wrap justify-center items-center gap-1 md:gap-2 px-4">
                    {plates.map((plate, i) => (
                        <img
                            key={plate.id}
                            src={plate.url}
                            alt={`Street Sign ${plate.id}`}
                            style={{
                                width: `${ratio[i] * containerWidth * 0.7}px`,
                                transform: `translateX(${offsetX[i] * ratio[i] * containerWidth}px) translateY(${offsetY[i] * ratio[i] * containerWidth}px)`,

                            }}
                            className="h-auto transition-transform duration-300 hover:-translate-y-2"
                        />
                    ))}
                </div>
            </div>
        );
    };


    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col lg:flex-row h-full lg:h-screen">
                <div className="lg:w-2/5 h-full flex flex-col p-4">
                    <div className="flex-1 flex items-end">
                        <div className="text-center w-full">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                                Memories Around the Corner
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 md:text-lg mt-4">
                                Exploring {allData.length.toLocaleString()} NYC commemorative street signs with LLM
                            </p>
                            <LandingPlates />
                        </div>
                    </div>
                    <div className="flex-1">
                        <Search
                            originalData={searchState.originalData}
                            currentData={searchState.currentData}
                            onFilter={handleNewSearch}
                            onReset={resetSearch}
                        />
                    </div>
                </div>

                {/* Right Panel: Map */}
                <div className="flex-1 p-4">
                    <Suspense fallback={<div>Loading map...</div>}>
                        <Map data={searchState.currentData} />
                    </Suspense>
                </div>
            </div>
            <Analytics />
            <SpeedInsights />
        </main>


    );
}