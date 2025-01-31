'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Search } from './Search';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { StreetNameEntry } from '../types';
import LandingPlate from './LandingPlate';
import { FaEnvelope } from 'react-icons/fa';

const Map = dynamic(() => import('./Map'), {
    ssr: false,
    loading: () => <div className="h-[600px] bg-gray-50 rounded-xl animate-pulse" />
});

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
                <div className="lg:w-2/5 h-full flex flex-col">
                    <div className="flex-1 flex items-end mt-4">
                        <div className="text-center w-full">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 px-4">
                                Memories Around the Corner
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 md:text-lg mt-4 px-4">
                                Exploring {allData.length.toLocaleString()} NYC commemorative street signs from NYC Open Data with LLM
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

                    {/* Desktop footer */}
                    <div className="hidden lg:flex text-xs text-gray-500 dark:text-gray-400 mt-auto items-center justify-center gap-1">
                        Jessie Han @2025 | Have Feedback?
                        <a href="mailto:onejessie@gmail.com" className="inline-flex items-center">
                            <FaEnvelope className="h-3 w-3" />
                        </a>
                    </div>
                </div>

                {/* Right Panel: Map */}
                <div className="flex-1 p-4">
                    <Suspense fallback={<div>Loading map...</div>}>
                        <Map data={currentData} isSearchActive={currentData.length < 1000} />
                    </Suspense>
                </div>

                {/* Mobile footer */}
                <div className="lg:hidden text-xs text-gray-500 dark:text-gray-400 p-4 flex items-center justify-center gap-1">
                    Jessie Han @2025 | Have Feedback?
                    <a href="mailto:onejessie@gmail.com" className="inline-flex items-center">
                        <FaEnvelope className="h-3 w-3" />
                    </a>
                </div>
            </div>
            <Analytics />
            <SpeedInsights />
        </main>
    );
}