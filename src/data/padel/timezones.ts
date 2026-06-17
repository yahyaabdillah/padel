// PadelHub — IANA timezone options for the Company Settings dropdown.
// Uses Intl.supportedValuesOf when available, otherwise a curated fallback list
// (Indonesia + common regions). value === label (the IANA id).

const FALLBACK_TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Pontianak",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Bangkok",
  "Asia/Manila",
  "Asia/Ho_Chi_Minh",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
  "Australia/Perth",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "UTC",
];

export function listTimezones(): string[] {
  try {
    const sv = (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf;
    if (typeof sv === "function") {
      const all = sv("timeZone");
      if (Array.isArray(all) && all.length > 0) return all;
    }
  } catch {
    /* fall through */
  }
  return FALLBACK_TIMEZONES;
}

export const TIMEZONE_OPTIONS = listTimezones().map((tz) => ({
  value: tz,
  label: tz.replace(/_/g, " "),
}));
