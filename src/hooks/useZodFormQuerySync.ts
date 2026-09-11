import { useCallback, useEffect, useMemo, useRef } from "react";
import type { z } from "zod";
import {
  readSearchParams,
  replaceUrlSearchParam,
} from "../lib/form-query-sync";
import {
  debounceMsForKey,
  defaultSerialize,
  parseQueryWithSchema,
  syncedKeys,
  type QueryFieldSerializerMap,
} from "../lib/zod-form-query";

type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;

type InferObject<T extends ZodObjectSchema> = z.infer<T>;

type StringKeys<T> = Extract<keyof T, string>;

export type UseZodFormQuerySyncOptions<TSchema extends ZodObjectSchema> = {
  /** Zod object schema — source of truth for inbound parse (safeParse per field). */
  schema: TSchema;
  /** Fields never read from or written to the URL. */
  exclude?: Array<StringKeys<InferObject<TSchema>>>;
  /** Override query param names (default: field key). */
  paramNames?: Partial<Record<StringKeys<InferObject<TSchema>>, string>>;
  /** Debounce write-back (ms). Number applies to all synced fields. */
  debounceMs?:
    number | Partial<Record<StringKeys<InferObject<TSchema>>, number>>;
  /**
   * Outbound serializers. Null/empty deletes the param.
   * Default: trim empty → null, else String(value).
   */
  serialize?: QueryFieldSerializerMap<TSchema>;
  /**
   * Current form values for synced fields. Parent owns state
   * (e.g. react-hook-form `watch`).
   */
  values: InferObject<TSchema>;
  /** Apply values parsed from the URL (mount + popstate). */
  onUrlValues: (values: InferObject<TSchema>) => void;
};

export {
  parseQueryWithSchema,
  serializeQueryWithSchema,
} from "../lib/zod-form-query";

/**
 * Bidirectional Zod-validated URL query ↔ form field sync.
 *
 * Pass a Zod object schema (string fields or coercible). Inbound values are
 * parsed with `safeParse`; outbound empty/invalid values delete the param.
 *
 * Pair with react-hook-form via `watch` + `setValue`/`reset`, or any form
 * state that supplies `values` + `onUrlValues`.
 */
export function useZodFormQuerySync<TSchema extends ZodObjectSchema>(
  options: UseZodFormQuerySyncOptions<TSchema>,
): {
  resetFromUrl: () => void;
} {
  const {
    schema,
    exclude,
    paramNames,
    debounceMs,
    serialize,
    values,
    onUrlValues,
  } = options;

  const schemaRef = useRef(schema);
  schemaRef.current = schema;
  const excludeRef = useRef(exclude);
  excludeRef.current = exclude;
  const paramNamesRef = useRef(paramNames);
  paramNamesRef.current = paramNames;
  const serializeRef = useRef(serialize);
  serializeRef.current = serialize;
  const onUrlValuesRef = useRef(onUrlValues);
  onUrlValuesRef.current = onUrlValues;
  const debounceMsRef = useRef(debounceMs);
  debounceMsRef.current = debounceMs;

  const keys = useMemo(
    () => syncedKeys(schema, exclude),
    // Module-level schemas are stable; exclude list is the varying input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- join captures exclude identity
    [schema, exclude?.join("|")],
  );

  const debounceTimers = useRef<
    Partial<
      Record<StringKeys<InferObject<TSchema>>, ReturnType<typeof setTimeout>>
    >
  >({});

  const clearDebounceTimers = useCallback(() => {
    for (const key of Object.keys(debounceTimers.current) as Array<
      StringKeys<InferObject<TSchema>>
    >) {
      const timer = debounceTimers.current[key];
      if (timer) {
        clearTimeout(timer);
        delete debounceTimers.current[key];
      }
    }
  }, []);

  const readFromUrl = useCallback(() => {
    return parseQueryWithSchema(schemaRef.current, readSearchParams(), {
      exclude: excludeRef.current,
      paramNames: paramNamesRef.current,
    }) as InferObject<TSchema>;
  }, []);

  const resetFromUrl = useCallback(() => {
    clearDebounceTimers();
    onUrlValuesRef.current(readFromUrl());
  }, [clearDebounceTimers, readFromUrl]);

  const writeParam = useCallback(
    (key: StringKeys<InferObject<TSchema>>, value: unknown) => {
      const param = paramNamesRef.current?.[key] ?? key;
      const serializer = serializeRef.current?.[key];
      const serialized = serializer
        ? serializer(value as InferObject<TSchema>[typeof key])
        : defaultSerialize(value);
      replaceUrlSearchParam(param, serialized);
    },
    [],
  );

  // Mount + back/forward: apply URL → form.
  useEffect(() => {
    resetFromUrl();
    const onPopState = () => resetFromUrl();
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      clearDebounceTimers();
    };
  }, [resetFromUrl, clearDebounceTimers]);

  // Form → URL (debounced per field).
  const valuesRef = useRef(values);
  useEffect(() => {
    const prev = valuesRef.current;
    valuesRef.current = values;

    for (const key of keys) {
      const nextValue = values[key];
      const prevValue = prev[key];
      if (Object.is(nextValue, prevValue)) continue;

      const delay = debounceMsForKey(debounceMsRef.current, key);
      const existing = debounceTimers.current[key];
      if (existing) clearTimeout(existing);

      if (delay <= 0) {
        writeParam(key, nextValue);
        continue;
      }

      debounceTimers.current[key] = setTimeout(() => {
        writeParam(key, nextValue);
        delete debounceTimers.current[key];
      }, delay);
    }
  }, [values, keys, writeParam]);

  return { resetFromUrl };
}
