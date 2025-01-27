import HomeWrapper from '../components/HomeWrapper';
import { StreetNameEntry } from '../types';
import data from './data/cleaned_data.json';

export default async function Home() {
  return <HomeWrapper allData={data as StreetNameEntry[]} />;
}