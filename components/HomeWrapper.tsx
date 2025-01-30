'use client';

import { useState, Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Search } from './Search';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { StreetNameEntry } from '../types';
import LandingPlate from './LandingPlate';

const Map = dynamic(() => import('./Map'), {
    ssr: false,
    loading: () => <div className="h-[600px] bg-gray-50 rounded-xl animate-pulse" />
});

// Fetch all data from Weaviate
async function fetchAllStreetNames(): Promise<StreetNameEntry[]> {
    try {
        const response = await fetch('/api/weaviate-all'); // New API route (to be added in `route.ts`)
        if (!response.ok) throw new Error('Failed to fetch data');
        return await response.json();
    } catch (error) {
        console.error('Error fetching Weaviate data:', error);
        return []; // Return empty array on failure
    }
}

export default function HomeWrapper({ allData }: { allData: StreetNameEntry[] }) {

    const [currentData, setCurrentData] = useState<StreetNameEntry[]>(allData);

    const handleNewSearch = (filteredEntries: StreetNameEntry[]) => {
        setCurrentData(filteredEntries);
    };

    // Reset to full dataset when Clear is clicked
    const resetSearch = () => {
        setCurrentData(allData);
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
                            <LandingPlate />
                        </div>
                    </div>
                    <div className="flex-1">
                        <Search
                            originalData={allData}
                            currentData={currentData}
                            onFilter={handleNewSearch}
                            onReset={resetSearch}
                        />
                    </div>
                </div>

                {/* Right Panel: Map */}
                <div className="flex-1 p-4">
                    <Suspense fallback={<div>Loading map...</div>}>
                        <Map data={currentData} />
                    </Suspense>
                </div>
            </div>
            <Analytics />
            <SpeedInsights />
        </main>


    );
}