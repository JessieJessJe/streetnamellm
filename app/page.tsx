import { Suspense } from 'react';
import HomeWrapper from '@/components/HomeWrapper';

export default async function Home() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/data/cleaned_data.json`);
  const allData = await response.json();

  return <HomeWrapper allData={allData} />;
}