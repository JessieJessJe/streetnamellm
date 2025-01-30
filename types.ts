// export interface StreetNameEntry {
//   id: string;
//   coname: string;
//   lat: number;
//   lng: number;
//   reason: string;
//   year: number;
//   borough: string;
//   location: string;
//   postal: string;
// }

export type StreetNameEntry = {
  record_id: string; // Unique identifier
  honorary_name: string; // Honorary street name
  borough: string; // Borough name
  type: "line" | "point"; // Either a street line or intersection
  limits: string; // Street limits
  bio: string; // Biography of the honoree
  geometry_wkt?: string; // WKT format for linestrings
  geolocation?: {
    longitude: number;
    latitude: number;
  }; // Now using nested geolocation instead of lat/lng
};

export interface SearchState {
  originalData: StreetNameEntry[];
  currentData: StreetNameEntry[];
}

export interface SearchProps {
  originalData: StreetNameEntry[];
  currentData: StreetNameEntry[];
  onFilter: (filteredEntries: StreetNameEntry[], query: string) => void;
  onReset: () => void;
}

export interface LLMRequest {
  entries: StreetNameEntry[];
  question: string;
}

export interface LLMResponse {
  answer: string;
  filteredEntries: StreetNameEntry[];
  filteredCount: number;
}
