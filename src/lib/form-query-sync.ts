/** Generic URL search-param helpers for form ↔ query sync. */

export type QueryParamSerializer = (value: string) => string | null;

export function replaceUrlSearchParam(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (value == null || value === "") url.searchParams.delete(key);
  else url.searchParams.set(key, value);

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    history.replaceState(history.state, "", next);
  }
}

export function readSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}
