import { useCallback, useEffect, useRef, useState } from "react";
import {
  readSearchParams,
  replaceUrlSearchParam,
  type QueryParamSerializer,
} from "../lib/form-query-sync";

export type FormQueryFieldConfig<T extends string = string> = {
  /** URL query param key */
  param: string;
  /** Parse raw query value → field value (empty string if invalid/absent) */
  parse: (raw: string | null) => T;
  /** Serialize field value → query value (null clears the param) */
  serialize: QueryParamSerializer;
  /** Debounce write-back in ms (0 = immediate). Useful for text inputs. */
  debounceMs?: number;
};

export type FormQuerySyncConfigs<TFields extends Record<string, string>> = {
  [K in keyof TFields]: FormQueryFieldConfig<TFields[K]>;
};

function readFieldsFromUrl<TFields extends Record<string, string>>(
  configs: FormQuerySyncConfigs<TFields>,
): TFields {
  const params = readSearchParams();
  const next = {} as TFields;
  for (const key of Object.keys(configs) as Array<keyof TFields>) {
    const config = configs[key];
    next[key] = config.parse(params.get(config.param)) as TFields[typeof key];
  }
  return next;
}

/**
 * Sync controlled form field state with URL query params.
 * - Seeds from `initialValues` (SSR-friendly) or the current URL
 * - Re-reads on `popstate`
 * - Writes back via `history.replaceState` when values change
 * - Empty serialized values clear the param
 */
export function useFormQuerySync<TFields extends Record<string, string>>(
  configs: FormQuerySyncConfigs<TFields>,
  initialValues?: TFields,
): {
  values: TFields;
  setField: <K extends keyof TFields>(key: K, value: TFields[K]) => void;
  setValues: (patch: Partial<TFields>) => void;
} {
  const configsRef = useRef(configs);
  configsRef.current = configs;

  const [values, setValuesState] = useState<TFields>(
    () => initialValues ?? readFieldsFromUrl(configs),
  );

  const debounceTimers = useRef<
    Partial<Record<keyof TFields, ReturnType<typeof setTimeout>>>
  >({});

  const writeParam = useCallback(
    <K extends keyof TFields>(key: K, value: TFields[K]) => {
      const config = configsRef.current[key];
      const serialized = config.serialize(value);
      replaceUrlSearchParam(config.param, serialized);
    },
    [],
  );

  const scheduleWrite = useCallback(
    <K extends keyof TFields>(key: K, value: TFields[K]) => {
      const config = configsRef.current[key];
      const delay = config.debounceMs ?? 0;
      const existing = debounceTimers.current[key];
      if (existing) clearTimeout(existing);

      if (delay <= 0) {
        writeParam(key, value);
        return;
      }

      debounceTimers.current[key] = setTimeout(() => {
        writeParam(key, value);
        delete debounceTimers.current[key];
      }, delay);
    },
    [writeParam],
  );

  const setField = useCallback(
    <K extends keyof TFields>(key: K, value: TFields[K]) => {
      setValuesState((prev) => {
        if (prev[key] === value) return prev;
        return { ...prev, [key]: value };
      });
      scheduleWrite(key, value);
    },
    [scheduleWrite],
  );

  const setValues = useCallback(
    (patch: Partial<TFields>) => {
      setValuesState((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const key of Object.keys(patch) as Array<keyof TFields>) {
          const value = patch[key];
          if (value === undefined) continue;
          if (next[key] !== value) {
            next[key] = value;
            changed = true;
            scheduleWrite(key, value);
          }
        }
        return changed ? next : prev;
      });
    },
    [scheduleWrite],
  );

  const clearDebounceTimers = useCallback(() => {
    for (const key of Object.keys(debounceTimers.current) as Array<
      keyof TFields
    >) {
      const timer = debounceTimers.current[key];
      if (timer) {
        clearTimeout(timer);
        delete debounceTimers.current[key];
      }
    }
  }, []);

  // Client navigations / back-forward: re-read the address bar.
  useEffect(() => {
    const onPopState = () => {
      // Drop in-flight debounced writes so they cannot overwrite history state.
      clearDebounceTimers();
      setValuesState(readFieldsFromUrl(configsRef.current));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [clearDebounceTimers]);

  // Static Astro builds cannot see request query params at SSR time — sync once on mount.
  useEffect(() => {
    setValuesState(readFieldsFromUrl(configsRef.current));
  }, []);

  // Clear pending debounced writes on unmount (do not flush — avoid late URL writes).
  useEffect(() => {
    return () => {
      clearDebounceTimers();
    };
  }, [clearDebounceTimers]);

  return { values, setField, setValues };
}
