/** Format a date-only `Date` (from YAML `YYYY-MM-DD`) without local TZ shift. */
export function formatLegalEffectiveDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}
