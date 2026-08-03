/**
 * Prisma returns `Decimal` instances (from decimal.js) for @db.Decimal
 * fields. JSON.stringify technically works on them (they have a toJSON),
 * but it stringifies to a *string*, which is awkward for numeric form
 * inputs on the client. This walks any Prisma result and converts Decimals
 * to plain JS numbers instead.
 */
export function serializePrisma<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((v) => serializePrisma(v)) as unknown as T;
  }

  if (value instanceof Date) {
    return value as T;
  }

  if (typeof value === "object") {
    const maybeDecimal = value as unknown as { toNumber?: () => number; toFixed?: () => string };
    if (typeof maybeDecimal.toNumber === "function" && typeof maybeDecimal.toFixed === "function") {
      return maybeDecimal.toNumber() as unknown as T;
    }

    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serializePrisma(val);
    }
    return out as T;
  }

  return value;
}
