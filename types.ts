export interface StreetNameEntry {
  id: string;
  coname: string;
  lat: number;
  lng: number;
  reason: string;
  year: number;
  borough: string;
  location: string;
  postal: string;
}

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
