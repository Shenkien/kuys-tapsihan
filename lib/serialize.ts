import type { Prisma } from "@prisma/client";

/**
 * Maps a Prisma result's TS type the same way serializePrisma transforms
 * it at runtime: Decimal -> number, Date stays Date, everything else
 * recurses. Without this, serializePrisma's signature lied — it returned
 * the *same* type it was given, so a `price: Decimal` field still looked
 * like `Decimal` to TypeScript after "serialization", and a component
 * prop typed `price: number` would only fail at `next build` time deep in
 * an unrelated admin page, not where the mistake actually was.
 */
type Serialized<T> = T extends Prisma.Decimal
  ? number
  : T extends Date
    ? T
    : T extends (infer U)[]
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;

/**
 * Prisma returns `Decimal` instances (from decimal.js) for @db.Decimal
 * fields. JSON.stringify technically works on them (they have a toJSON),
 * but it stringifies to a *string*, which is awkward for numeric form
 * inputs on the client. This walks any Prisma result and converts Decimals
 * to plain JS numbers instead.
 */
export function serializePrisma<T>(value: T): Serialized<T> {
  if (value === null || value === undefined) return value as Serialized<T>;

  if (Array.isArray(value)) {
    return value.map((v) => serializePrisma(v)) as unknown as Serialized<T>;
  }

  if (value instanceof Date) {
    return value as unknown as Serialized<T>;
  }

  if (typeof value === "object") {
    const maybeDecimal = value as unknown as { toNumber?: () => number; toFixed?: () => string };
    if (typeof maybeDecimal.toNumber === "function" && typeof maybeDecimal.toFixed === "function") {
      return maybeDecimal.toNumber() as unknown as Serialized<T>;
    }

    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serializePrisma(val);
    }
    return out as unknown as Serialized<T>;
  }

  return value as unknown as Serialized<T>;
}
