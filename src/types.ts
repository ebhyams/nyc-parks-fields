export interface Park {
  code: string;
  name: string;
  borough: string; // M | B | Q | X | R
  isWhole: boolean;
}

export interface RawPermit {
  Field: string;
  Start: string;
  End: string;
  "Sport or Event Type": string;
  "Event Name": string;
  Organization: string;
  "Event Status": string;
}

export interface ParkPermits {
  park: Park;
  permits: RawPermit[];
}

export interface SlotRow {
  hour: number;
  park: string;
  borough: string;
  freeCount: number;
  totalOfType: number;
}

export interface DayAvailability {
  label: string;
  rows: SlotRow[];
}
