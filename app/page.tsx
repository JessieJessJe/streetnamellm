import HomeWrapper from '../components/HomeWrapper';
import { StreetNameEntry } from '../types';
import data from './data/streetnames.json';

export default async function Home() {
  return <HomeWrapper allData={data as StreetNameEntry[]} />;
}