import { Suspense } from 'react';
import MapContainer from '@/components/MapContainer';
import { Search } from '@/components/Search';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default async function Home() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/data/cleaned_data.json`);
  const allData = await response.json();

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

        <Search data={allData} />

        <Suspense fallback={<div>Loading map...</div>}>
          <MapContainer data={allData} />
        </Suspense>

        <Analytics />
        <SpeedInsights />
      </div>
    </main>
  );
}