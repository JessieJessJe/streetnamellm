'use client';

import { useState, Suspense } from 'react';
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

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col lg:flex-row h-full lg:h-screen">
                {/* Left Panel: Header */}
                <div className="lg:w-2/5 flex items-center justify-center p-4">
                    <div className="text-center">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                            Memories Around the Corner
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 md:text-lg mt-4">
                            Exploring {allData.length.toLocaleString()} NYC commemorative street signs with LLM
                        </p>
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
        </main>


    );
}