export const FIELD_TYPES = [
  "Baseball - Adult",
  "Baseball - Little League 12 and Under",
  "Baseball - Little League 13 and Older",
  "Basketball",
  "Bocce",
  "Cricket",
  "Football - Adult",
  "Football - Flag",
  "Football - Wheelchair",
  "Football - Youth",
  "Frisbee",
  "Handball",
  "Hockey",
  "Kickball",
  "Lacrosse",
  "Netball",
  "Rugby",
  "Soccer - Non Regulation",
  "Soccer - Regulation",
  "Softball - Adult",
  "Softball - Little League",
  "T Ball",
  "Track and Field",
  "Volleyball",
  "All fields and courts",
] as const;

export const BOROUGH_NAMES: Record<string, string> = {
  M: "Manhattan",
  B: "Brooklyn",
  Q: "Queens",
  X: "Bronx",
  R: "Staten Island",
};

export const OPEN_HOUR = 6;   // 6 AM
export const CLOSE_HOUR = 23; // 11 PM (last slot 10–11 PM)
export const CONCURRENCY = 8;
export const CSV_CACHE_TTL_MS = 10 * 60 * 1000;

export const SOCRATA_BASE_URL =
  "https://data.cityofnewyork.us/resource/c5vm-g2dk.json";

export const csvUrl = (code: string) =>
  `https://www.nycgovparks.org/permits/field-and-court/issued/${encodeURIComponent(code)}/csv`;
