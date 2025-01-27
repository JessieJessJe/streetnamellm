'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Search } from './Search';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const Map = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div className="h-[600px] bg-gray-50 rounded-xl animate-pulse" />
});

interface SearchState {
    originalData: any[];
    currentData: any[];
    history: Array<{ query: string; resultCount: number }>;
    historyPointer: number;
}

export default function HomeWrapper({ allData }: { allData: any[] }) {
    const [searchState, setSearchState] = useState<SearchState>({
        originalData: allData,
        currentData: allData,
        history: [],
        historyPointer: -1
    });

    const handleNewSearch = (filteredEntries: any[], query: string) => {
        setSearchState(prev => {
            const newHistory = [...prev.history.slice(0, prev.historyPointer + 1),
            { query, resultCount: filteredEntries.length }];

            return {
                ...prev,
                currentData: filteredEntries,
                history: newHistory,
                historyPointer: newHistory.length - 1
            };
        });
    };

    const navigateHistory = (index: number) => {
        setSearchState(prev => {
            const historicalData = prev.history
                .slice(0, index + 1);

            return {
                ...prev,
                currentData: historicalData,
                historyPointer: index
            };
        });
    };

    const resetSearch = () => {
        setSearchState({
            originalData: allData,
            currentData: allData,
            history: [],
            historyPointer: -1
        });
    };

    return (
        <main className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="text-center space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                        NYC Honorary Street Names
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 md:text-lg">
                        Exploring {allData.length.toLocaleString()} commemorative street signs
                    </p>
                </header>

                <Search
                    originalData={searchState.originalData}
                    currentData={searchState.currentData}
                    onFilter={handleNewSearch}
                    onReset={resetSearch}
                />

                <Suspense fallback={<div>Loading map...</div>}>
                    <Map data={searchState.currentData} />
                </Suspense>

                <Analytics />
                <SpeedInsights />
            </div>
        </main>
    );
}