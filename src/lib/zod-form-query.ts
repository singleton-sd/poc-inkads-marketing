import type { z } from "zod";

type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;

type InferObject<T extends ZodObjectSchema> = z.infer<T>;

type StringKeys<T> = Extract<keyof T, string>;

export type QueryFieldSerializerMap<TSchema extends ZodObjectSchema> = Partial<{
  [K in StringKeys<InferObject<TSchema>>]: (
    value: InferObject<TSchema>[K],
  ) => string | null;
}>;

function syncedKeys<TSchema extends ZodObjectSchema>(
  schema: TSchema,
  exclude: Array<StringKeys<InferObject<TSchema>>> = [],
): Array<StringKeys<InferObject<TSchema>>> {
  const excluded = new Set(exclude);
  return (
    Object.keys(schema.shape) as Array<StringKeys<InferObject<TSchema>>>
  ).filter((key) => !excluded.has(key));
}

function defaultSerialize(value: unknown): string | null {
  if (value == null) return null;
  const asString = String(value).trim();
  return asString === "" ? null : asString;
}

/**
 * Parse URL search params through a Zod object schema (field-by-field safeParse).
 * Invalid / missing values fall back to each field's safeParse failure path
 * (typically `.catch("")` on query field schemas).
 */
export function parseQueryWithSchema<TSchema extends ZodObjectSchema>(
  schema: TSchema,
  params: URLSearchParams,
  options?: {
    exclude?: Array<StringKeys<InferObject<TSchema>>>;
    paramNames?: Partial<Record<StringKeys<InferObject<TSchema>>, string>>;
  },
): Partial<InferObject<TSchema>> {
  const keys = syncedKeys(schema, options?.exclude);
  const shape = schema.shape as Record<string, z.ZodType>;
  const next: Partial<InferObject<TSchema>> = {};

  for (const key of keys) {
    const param = options?.paramNames?.[key] ?? key;
    const fieldSchema = shape[key];
    const raw = params.get(param);
    const parsed = fieldSchema.safeParse(raw);
    (next as Record<string, unknown>)[key] = parsed.success ? parsed.data : "";
  }

  return next;
}

/**
 * Serialize synced field values to URL search params.
 * Empty/invalid serialized values delete the param.
 */
export function serializeQueryWithSchema<TSchema extends ZodObjectSchema>(
  schema: TSchema,
  values: Partial<InferObject<TSchema>>,
  options?: {
    exclude?: Array<StringKeys<InferObject<TSchema>>>;
    paramNames?: Partial<Record<StringKeys<InferObject<TSchema>>, string>>;
    serialize?: QueryFieldSerializerMap<TSchema>;
  },
): Array<{ param: string; value: string | null }> {
  const keys = syncedKeys(schema, options?.exclude);
  const out: Array<{ param: string; value: string | null }> = [];

  for (const key of keys) {
    if (!(key in values)) continue;
    const param = options?.paramNames?.[key] ?? key;
    const rawValue = values[key];
    const serializer = options?.serialize?.[key];
    const serialized = serializer
      ? serializer(rawValue as InferObject<TSchema>[typeof key])
      : defaultSerialize(rawValue);
    out.push({ param, value: serialized });
  }

  return out;
}

export function debounceMsForKey<T extends string>(
  debounceMs: number | Partial<Record<T, number>> | undefined,
  key: T,
): number {
  if (debounceMs == null) return 0;
  if (typeof debounceMs === "number") return debounceMs;
  return debounceMs[key] ?? 0;
}

export { syncedKeys, defaultSerialize };
